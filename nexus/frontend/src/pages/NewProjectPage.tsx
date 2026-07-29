import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { projectsService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, FieldHint, FieldError } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function NewProjectPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    domain: '',
    projectType: '',
    targetUsers: '',
    platform: '',
    preferredTech: '',
    constraints: '',
    teamSize: '',
    timeline: '',
    skillLevel: '' as '' | 'beginner' | 'intermediate' | 'advanced',
  });

  const on = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
      };
      if (form.domain) payload.domain = form.domain;
      if (form.projectType) payload.projectType = form.projectType;
      if (form.targetUsers) payload.targetUsers = form.targetUsers;
      if (form.platform) payload.platform = form.platform;
      if (form.preferredTech) payload.preferredTech = form.preferredTech;
      if (form.constraints) payload.constraints = form.constraints;
      if (form.teamSize) payload.teamSize = Number(form.teamSize);
      if (form.timeline) payload.timeline = form.timeline;
      if (form.skillLevel) payload.skillLevel = form.skillLevel;
      return projectsService.create(payload as any);
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      navigate(`/projects/${project._id}`);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Research Project</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Describe what you want to build or research. NEXUS will analyze the landscape, find evidence,
          identify gaps, design architecture, and produce an actionable roadmap.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Core */}
        <div>
          <Label htmlFor="title">Project title</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={on('title')}
            placeholder="e.g. AI-powered attendance system"
            minLength={3}
            maxLength={100}
          />
          <FieldHint>A concise name — you can change it later.</FieldHint>
        </div>

        <div>
          <Label htmlFor="desc">What do you want to build?</Label>
          <Textarea
            id="desc"
            required
            value={form.description}
            onChange={on('description')}
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Describe your idea in as much detail as you'd like. A single sentence works — or a full spec. NEXUS adapts to what you give it."
          />
          <FieldHint>
            This is the primary input NEXUS will research. More detail = more relevant results.
          </FieldHint>
        </div>

        {/* Progressive disclosure */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showAdvanced ? 'Less options' : 'More options (optional)'}
        </button>

        {showAdvanced ? (
          <div className="space-y-4 border border-border rounded-lg p-4 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" value={form.domain} onChange={on('domain')} placeholder="e.g. Education, Healthcare" />
              </div>
              <div>
                <Label htmlFor="projectType">Type</Label>
                <Input id="projectType" value={form.projectType} onChange={on('projectType')} placeholder="e.g. Web app, Mobile app" />
              </div>
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Input id="platform" value={form.platform} onChange={on('platform')} placeholder="e.g. Web, iOS, Cross-platform" />
              </div>
              <div>
                <Label htmlFor="targetUsers">Target users</Label>
                <Input id="targetUsers" value={form.targetUsers} onChange={on('targetUsers')} placeholder="e.g. Students, Enterprise teams" />
              </div>
              <div>
                <Label htmlFor="preferredTech">Preferred tech</Label>
                <Input id="preferredTech" value={form.preferredTech} onChange={on('preferredTech')} placeholder="e.g. React, Python, AWS" />
              </div>
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input id="timeline" value={form.timeline} onChange={on('timeline')} placeholder="e.g. 3 months, MVP in 6 weeks" />
              </div>
              <div>
                <Label htmlFor="teamSize">Team size</Label>
                <Input id="teamSize" type="number" min={1} max={100} value={form.teamSize} onChange={on('teamSize')} placeholder="e.g. 3" />
              </div>
              <div>
                <Label htmlFor="skillLevel">Skill level</Label>
                <select
                  id="skillLevel"
                  value={form.skillLevel}
                  onChange={on('skillLevel') as any}
                  className="flex h-10 w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Any level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="constraints">Constraints / notes</Label>
              <Textarea
                id="constraints"
                value={form.constraints}
                onChange={on('constraints')}
                placeholder="Budget limits, privacy requirements, accessibility standards, preferred languages…"
                rows={3}
              />
            </div>
          </div>
        ) : null}

        <FieldError>{error}</FieldError>

        {/* Submit */}
        <div className="pt-2 flex items-center gap-3">
          <Button type="submit" variant="primary" size="lg" loading={mutation.isPending}>
            <Sparkles className="h-4 w-4" />
            {mutation.isPending ? 'Creating' : 'Create & Start Research'}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
