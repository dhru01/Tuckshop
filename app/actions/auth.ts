'use server';

import { redirect } from 'next/navigation';

import { writeActiveContextCookie, clearActiveContextCookie } from '@/lib/auth/context-cookie';
import { loadRoleContexts, matchesContext } from '@/lib/auth/load-contexts';
import type { RoleContext } from '@/lib/auth/context-types';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import { signOutEverywhere } from '@/lib/auth/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  selectContextSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validations/auth';
import { publicEnv } from '@/lib/env/public';

export type AuthActionState = { error?: string; success?: boolean; redirectTo?: string };

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' };
    }
    return { error: 'Invalid email or password.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Invalid email or password.' };

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  const contexts = await loadRoleContexts(supabase, user.id);
  const next = formData.get('next');
  const nextStr = typeof next === 'string' ? next : null;
  redirect(resolvePostLoginPath(contexts, nextStr));
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    },
  });

  if (error) {
    return { error: 'We could not create your account. Try a different email.' };
  }

  redirect('/verify-email?registered=1');
}

export async function signOutAction(): Promise<void> {
  await signOutEverywhere();
  redirect('/login');
}

/** Re-verify the signed-in cashier password without leaving the POS (inactivity lock). */
export async function posReauthAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get('password');
  if (typeof password !== 'string' || password.length < 1) {
    return { error: 'Password is required' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) {
    return { error: 'Your session expired. Sign in again from the menu.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'Incorrect password.' };
  }

  return { success: true };
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: 'We could not send a reset email. Please try again.' };
  }

  return { success: true };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: 'Your reset link may have expired. Request a new one.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const contexts = await loadRoleContexts(supabase, user.id);
  redirect(resolvePostLoginPath(contexts));
}

export async function selectContextAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const schoolRaw = formData.get('schoolId');
  const nextRaw = formData.get('next');
  const parsed = selectContextSchema.safeParse({
    role: formData.get('role'),
    schoolId: typeof schoolRaw === 'string' && schoolRaw.trim().length > 0 ? schoolRaw.trim() : null,
    next: typeof nextRaw === 'string' && nextRaw.length > 0 ? nextRaw : undefined,
  });
  if (!parsed.success) {
    return { error: 'Invalid context selection' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const contexts = await loadRoleContexts(supabase, user.id);
  const target: RoleContext = {
    role: parsed.data.role,
    schoolId: parsed.data.schoolId,
    schoolName: null,
    schoolStatus: null,
  };
  const chosen = contexts.find((c) => matchesContext(c, target));
  if (!chosen) {
    return { error: 'That workspace is not available for your account.' };
  }

  await writeActiveContextCookie(chosen);

  const next = parsed.data.next;
  const redirectTo =
    next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : resolvePostLoginPath([chosen]);

  return { success: true, redirectTo };
}

export async function clearContextAndSignOutAction(): Promise<void> {
  await clearActiveContextCookie();
  await signOutEverywhere();
  redirect('/login');
}
