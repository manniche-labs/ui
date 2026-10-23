import { Bell, Info, Keyboard, Palette, Plug, User } from 'lucide-react'
import { useState } from 'react'
import { Switch } from '@/registry/manniche/switch/switch'
import { SettingsHeading, SettingsRow, SettingsWindow, useSettingsShortcut, type SettingsSection } from '@/registry/manniche/settings-window/settings-window'

const FIELD =
  'h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring sm:w-64'
const BUTTON =
  'inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring'
const QUIET =
  'inline-flex min-h-11 items-center rounded-xl border bg-card px-4 text-sm font-medium outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring'

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex gap-1">
      {keys.map((k) => (
        <kbd key={k} className="min-w-7 rounded-md border bg-muted px-1.5 text-center font-sans text-xs leading-6 text-foreground">
          {k}
        </kbd>
      ))}
    </span>
  )
}

export default function SettingsWindowDemo() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<string | null>(null)
  const [theme, setTheme] = useState('system')
  const [connected, setConnected] = useState(false)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  const openAt = (id: string | null) => {
    setSection(id)
    setOpen(true)
  }
  useSettingsShortcut(() => openAt(section))

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User />,
      group: 'Account',
      description: 'How you show up to others in this demo.',
      content: (
        <>
          <SettingsRow label="Display name" description="Shown next to things you change.">
            {({ labelId, descriptionId }) => <input defaultValue="Demo user" aria-labelledby={labelId} aria-describedby={descriptionId} className={FIELD} />}
          </SettingsRow>
          <SettingsRow label="Email" description="Where sign-in links go.">
            {({ labelId }) => <input type="email" defaultValue="demo@example.com" aria-labelledby={labelId} className={FIELD} />}
          </SettingsRow>
        </>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell />,
      group: 'Account',
      content: (
        <>
          <SettingsHeading>Email</SettingsHeading>
          <SettingsRow label="Weekly summary" description="One mail on Monday with what changed.">
            <Switch aria-label="Weekly summary" defaultChecked />
          </SettingsRow>
          <SettingsRow label="Mentions" description="When someone names you in a comment.">
            <Switch aria-label="Mentions" defaultChecked />
          </SettingsRow>
          <SettingsHeading>On this device</SettingsHeading>
          <SettingsRow label="Sounds" description="A soft tone when a task is done.">
            <Switch aria-label="Sounds" />
          </SettingsRow>
        </>
      ),
    },
    {
      id: 'connections',
      label: 'Connections',
      icon: <Plug />,
      group: 'Workspace',
      badge: connected ? undefined : 'Login rejected',
      badgeTone: 'warning',
      description: 'Services this demo reads from.',
      content: () => (
        <SettingsRow
          label="Sample calendar"
          description={connected ? 'Connected. Events show in the planner.' : 'The service turned the login down. Sign in again to keep events in sync.'}
        >
          <button type="button" onClick={() => setConnected((c) => !c)} className={connected ? QUIET : BUTTON}>
            {connected ? 'Disconnect calendar' : 'Sign in again'}
          </button>
        </SettingsRow>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette />,
      group: 'Workspace',
      content: () => (
        <SettingsRow label="Theme" description="System follows your device." stacked>
          {({ labelId }) => (
            <div role="radiogroup" aria-labelledby={labelId} className="inline-flex rounded-xl border bg-muted p-1">
              {['system', 'light', 'dark'].map((t) => (
                <label
                  key={t}
                  className="relative inline-flex min-h-10 cursor-pointer items-center rounded-lg px-4 text-sm capitalize has-checked:bg-card has-checked:font-medium has-checked:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
                >
                  <input type="radio" name="demo-theme" value={t} checked={theme === t} onChange={() => setTheme(t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          )}
        </SettingsRow>
      ),
    },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      icon: <Keyboard />,
      group: 'Workspace',
      content: (
        <>
          <SettingsRow label="Open settings">
            <Keys keys={[isMac ? '⌘' : 'Ctrl', ',']} />
          </SettingsRow>
          <SettingsRow label="Close this window">
            <Keys keys={['Esc']} />
          </SettingsRow>
          <SettingsRow label="Move between sections">
            <Keys keys={['↑', '↓']} />
          </SettingsRow>
        </>
      ),
    },
    {
      id: 'about',
      label: 'About',
      icon: <Info />,
      content: (
        <SettingsRow label="Version" description="Demo data only; nothing here is saved.">
          <span className="text-sm text-muted-foreground tabular-nums">1.0 (demo)</span>
        </SettingsRow>
      ),
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button type="button" onClick={() => openAt(null)} className={BUTTON}>
        Open settings
      </button>
      <button type="button" onClick={() => openAt('connections')} className={QUIET}>
        Fix calendar login
      </button>
      <p className="m-0 w-full text-center text-sm text-muted-foreground">
        Or press <Keys keys={[isMac ? '⌘' : 'Ctrl', ',']} />
      </p>
      <SettingsWindow
        open={open}
        onOpenChange={setOpen}
        sections={sections}
        section={section}
        onSectionChange={setSection}
        footer="Version 1.0 (demo)"
      />
    </div>
  )
}
