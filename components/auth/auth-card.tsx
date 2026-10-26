import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-lift [--card-spacing:--spacing(7)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        {description ? <CardDescription className="text-sm">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
