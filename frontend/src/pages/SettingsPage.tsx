import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <SectionHeader title="Settings" description="Manage your account and preferences." />

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} src={user?.avatar} size={56} />
            <div>
              <div className="text-sm font-medium text-foreground">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div>
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" defaultValue={user?.name ?? ''} />
            </div>
            <div>
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" defaultValue={user?.email ?? ''} disabled />
            </div>
          </div>
          <div className="pt-2">
            <Button variant="default" size="md">Save changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge tone="accent">{user?.plan ?? 'free'}</Badge>
            <span className="text-sm text-muted-foreground">
              Free plan includes unlimited projects and basic research.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            NEXUS uses a dark theme optimized for long research sessions. Light mode is planned for a future release.
          </p>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-clay-500/25">
        <CardHeader>
          <CardTitle className="text-clay-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account removes all projects, research data, and settings permanently.
          </p>
          <Button variant="destructive" size="md">Delete account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
