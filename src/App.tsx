import { useEffect, useMemo, useState } from 'react'

const heroImage = '/friendsup-venue-cinema.jpeg'
const gamesImage = '/friendsup-venue-games.jpeg'
const whatsappCommunityUrl = ''

type IconName =
  | 'arrow'
  | 'calendar'
  | 'check'
  | 'clock'
  | 'close'
  | 'location'
  | 'lock'
  | 'minus'
  | 'plus'
  | 'sparkle'
  | 'ticket'
  | 'sun'
  | 'moon'

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    sparkle: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Zm6 11 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />,
    ticket: (
      <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Zm6 0v12" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    ),
    moon: (
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('friendsup_theme')
      if (saved === 'dark' || saved === 'light') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('friendsup_theme', theme)
  }, [theme])

  const [page, setPage] = useState<'home' | 'tickets'>('home')
  const [tickets, setTickets] = useState(1)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  // mpesaStep: 'phone' | 'waiting' | 'confirmed'
  const [mpesaStep, setMpesaStep] = useState<'phone' | 'waiting' | 'confirmed'>('phone')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')


  const total = useMemo(
    () => Math.floor(tickets / 2) * 1500 + (tickets % 2) * 800,
    [tickets],
  )
  const formatPrice = (price: number) => `KSh ${price.toLocaleString('en-KE')}`

  const goTo = (nextPage: 'home' | 'tickets') => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openPayment = () => {
    setMpesaStep('phone')
    setPhone('')
    setPhoneError('')
    setEmail('')
    setEmailError('')
    setPaymentOpen(true)
  }

  const closePayment = () => {
    setPaymentOpen(false)
    setMpesaStep('phone')
    setPhone('')
    setPhoneError('')
    setEmail('')
    setEmailError('')
  }

  const submitPhone = () => {

    const cleaned = phone.replace(/\s+/g, '')
    const validPhone = /^(07|01|\+2547|\+2541)\d{8}$/.test(cleaned)
    let hasError = false
    if (!validPhone) {
      setPhoneError('Enter a valid Safaricom number, e.g. 0712 345 678')
      hasError = true
    } else {
      setPhoneError('')
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!validEmail) {
      setEmailError('Enter a valid email address')
      hasError = true
    } else {
      setEmailError('')
    }

    if (hasError) return
    setMpesaStep('waiting')
    // Simulate STK push response after 4 seconds
    setTimeout(() => setMpesaStep('confirmed'), 4000)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark bg-[#0F1512] text-[#E7ECE8]' : 'bg-[#F5F2EA] text-[#1C211C]'}`}>
      <header className="sticky top-0 z-30 border-b border-[#1C211C]/10 bg-[#F5F2EA]/90 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#0F1512]/90">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => goTo('home')}
            className="flex items-center gap-2.5"
            aria-label="FriendsUp home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#214E42] text-[#FFF9EE] shadow-sm">
              <Icon name="sparkle" className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em] dark:text-white">friendsup</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#1C211C] transition hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAuthTab('login'); setAuthOpen(true) }}
              className="hidden rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:block"
            >
              Log in
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setAuthOpen(true) }}
              className="hidden rounded-full border border-[#1C211C]/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:block"
            >
              Sign up
            </button>
            <button
              onClick={() => goTo('tickets')}
              className="rounded-full bg-[#1C211C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#214E42] dark:bg-[#D6F064] dark:text-[#18251C] dark:hover:bg-[#C4E14E]"
            >
              Get tickets
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 sm:py-10">
        <div className="mb-5 flex items-center gap-2 text-sm text-[#70766E] dark:text-[#9BA399]">
          <span>FriendsUp</span>
          <span>/</span>
          <span className="font-medium text-[#1C211C] dark:text-white">
            {page === 'home' ? 'Movie Night — Edition One' : 'Tickets & payment'}
          </span>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px] xl:gap-12">
          <div className={page === 'home' ? 'lg:col-span-2' : 'hidden'}>
            <section className="group relative min-h-[490px] overflow-hidden rounded-[32px] bg-[#18362F] shadow-[0_24px_70px_rgba(34,46,36,0.14)] sm:min-h-[570px]">
              <img
                src={heroImage}
                alt="The FriendsUp venue with its big projector screen, lounge seating, and colorful lights"
                className="absolute inset-0 h-full w-full object-cover object-[center_58%] transition duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,16,0.06)_20%,rgba(9,17,14,0.88)_100%)]" />
              <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md sm:left-7 sm:top-7">
                A FriendsUp original
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#D6F064] px-3.5 py-1.5 text-xs font-bold text-[#203026]">
                    Friends night
                  </span>
                  <span className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md">
                    8 spots left
                  </span>
                </div>
                <h1 className="max-w-2xl text-[2.7rem] font-semibold leading-[0.96] tracking-[-0.055em] sm:text-[4.25rem]">
                  FriendsUp
                  <br />
                  Movie Night
                  <br />
                  <span className="text-[#D6F064]">Edition One</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
                  A feel-good screening made for meeting new people and turning a simple
                  movie night into a real friends night.
                </p>
                <button
                  onClick={() => goTo('tickets')}
                  className="mt-6 flex items-center gap-2 rounded-full bg-[#D6F064] px-5 py-3.5 text-sm font-bold text-[#1D291F] transition hover:bg-[#C4E14E]"
                >
                  Get your tickets
                  <Icon name="arrow" className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section id="details" className="grid gap-px overflow-hidden rounded-[26px] bg-[#D8D5CC] dark:bg-white/10 sm:grid-cols-3 mt-5">
              {[
                { icon: 'calendar' as const, label: 'Date', value: 'Saturday, 24 August' },
                { icon: 'clock' as const, label: 'Time', value: 'Doors at 7:30 PM' },
                {
                  icon: 'location' as const,
                  label: 'Location',
                  value: 'Komarock Backyard',
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-3.5 bg-white/60 dark:bg-[#161F1A] p-5 sm:p-6 transition-colors">
                  <Icon name={item.icon} className="mt-0.5 h-5 w-5 text-[#214E42] dark:text-[#D6F064]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7C8279] dark:text-[#9BA399]">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-[#1C211C] dark:text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-9">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C8279] dark:text-[#9BA399]">
                    The real FriendsUp space
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] dark:text-white">
                    See where the night happens
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-[#70776E] dark:text-[#A4ACA2]">
                  A relaxed indoor venue with a big-screen setup, lounge seating, colorful
                  lights, and games between screenings.
                </p>
              </div>
              <div className="grid h-[440px] grid-cols-5 gap-3 overflow-hidden rounded-[28px] sm:h-[520px]">
                <figure className="group relative col-span-3 overflow-hidden bg-[#1D2D28]">
                  <img
                    src={heroImage}
                    alt="Projector screen and lounge seating inside the FriendsUp venue"
                    className="h-full w-full object-cover object-[center_55%] transition duration-700 group-hover:scale-[1.03]"
                  />
                  <figcaption className="absolute bottom-4 left-4 rounded-full bg-[#FFFDF7]/90 dark:bg-[#161F1A]/90 dark:text-white px-3.5 py-2 text-xs font-semibold backdrop-blur-md sm:bottom-5 sm:left-5">
                    Big-screen lounge
                  </figcaption>
                </figure>
                <figure className="group relative col-span-2 overflow-hidden bg-[#372C20]">
                  <img
                    src={gamesImage}
                    alt="Dartboard and colorful party lights at the FriendsUp venue"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                  <figcaption className="absolute bottom-4 left-4 rounded-full bg-[#FFFDF7]/90 dark:bg-[#161F1A]/90 dark:text-white px-3.5 py-2 text-xs font-semibold backdrop-blur-md sm:bottom-5 sm:left-5">
                    Darts &amp; games
                  </figcaption>
                </figure>
              </div>
            </section>

            {/* Games section */}
            <section className="mt-9">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C8279] dark:text-[#9BA399]">
                    Between screenings
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] dark:text-white">
                    Games we play
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-[#70776E] dark:text-[#A4ACA2]">
                  While you're waiting for the film or just having a great time, jump into a board game with new friends.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    src: '/game-cards.jfif',
                    alt: 'Playing cards spread on a table during a card game night',
                    label: 'Card Game Night',
                    description: 'Classic card games for all skill levels — from Go Fish to Kadi.',
                  },
                  {
                    src: '/game-snakes.jfif',
                    alt: 'Snakes and Ladders board game in play with colourful pieces',
                    label: 'Snakes & Ladders',
                    description: 'The timeless board game that brings everyone together, laugh included.',
                  },
                  {
                    src: '/game-kenya50.jfif',
                    alt: 'Kenya @50 trivia board game laid out on a table',
                    label: 'Kenya @50',
                    description: 'A Kenyan trivia board game — test your knowledge of culture & history.',
                  },
                ].map((game) => (
                  <figure
                    key={game.label}
                    className="group relative overflow-hidden rounded-[22px] bg-[#1D2D28]"
                    style={{ height: '320px' }}
                  >
                    <img
                      src={game.src}
                      alt={game.alt}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(9,17,14,0.82)_100%)]" />
                    <figcaption className="absolute inset-x-0 bottom-0 p-5">
                      <span className="inline-block rounded-full bg-[#D6F064] px-3 py-1 text-[11px] font-bold text-[#1D291F]">
                        {game.label}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-white/80">{game.description}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

          </div>

          {page === 'tickets' && (
            <section>
              <button
                onClick={() => goTo('home')}
                className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#596158] transition hover:text-[#1C211C] dark:text-[#9BA399] dark:hover:text-white"
              >
                <Icon name="arrow" className="h-4 w-4 rotate-180" />
                Back to event
              </button>
              <div className="overflow-hidden rounded-[28px] bg-[#18362F] shadow-[0_20px_60px_rgba(34,46,36,0.13)]">
                <div className="relative h-[330px] sm:h-[400px]">
                  <img
                    src={heroImage}
                    alt="The FriendsUp venue projector and lounge"
                    className="h-full w-full object-cover object-[center_55%]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(9,17,14,0.82)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <span className="rounded-full bg-[#D6F064] px-3 py-1.5 text-xs font-bold text-[#203026]">
                      8 spots left
                    </span>
                    <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                      FriendsUp Movie Night
                      <br />
                      <span className="text-[#D6F064]">Edition One</span>
                    </h1>
                  </div>
                </div>
                <div className="grid gap-px bg-white/15 sm:grid-cols-3">
                  {[
                    { icon: 'calendar' as const, label: 'Sat, Aug 24' },
                    { icon: 'clock' as const, label: '7:30 PM' },
                    { icon: 'location' as const, label: 'Komarock Backyard' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 bg-[#214E42] px-5 py-4 text-sm font-medium text-white"
                    >
                      <Icon name={item.icon} className="h-4 w-4 text-[#D6F064]" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-[22px] border border-[#1C211C]/10 dark:border-white/10 dark:bg-[#161F1A]/60 p-5">
                <p className="text-sm font-semibold dark:text-white">Your ticket includes</p>
                <div className="mt-3 grid gap-2 text-sm text-[#687067] dark:text-[#A4ACA2] sm:grid-cols-2">
                  {['Movie screening', 'Unlimited ratish', 'Games access'].map((item) => (
                    <span key={item} className="flex items-center gap-2">
                      <Icon name="check" className="h-4 w-4 text-[#214E42] dark:text-[#D6F064]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {page === 'tickets' && (
            <aside className="lg:sticky lg:top-20">
            <div className="rounded-[28px] bg-[#FFFDF7] p-6 shadow-[0_16px_55px_rgba(42,48,39,0.12)] sm:p-7 dark:bg-[#161F1A] dark:shadow-none dark:border dark:border-white/10">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#858B81] dark:text-[#9BA399]">
                    Save your seat
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] dark:text-white">
                    Join the movie night
                  </h2>
                </div>
                <span className="rounded-full bg-[#E8F0D0] dark:bg-[#203026] p-2.5 text-[#214E42] dark:text-[#D6F064]">
                  <Icon name="ticket" className="h-5 w-5" />
                </span>
              </div>

              <div className="flex items-center justify-between border-y border-[#1C211C]/10 dark:border-white/10 py-5">
                <div>
                  <p className="text-sm font-semibold dark:text-white">Number of spots</p>
                  <p className="mt-1 text-xs text-[#7B8179] dark:text-[#9BA399]">Bring someone along</p>
                </div>
                <div className="flex items-center gap-4 rounded-full bg-[#F1EEE5] dark:bg-[#0F1512] p-1">
                  <button
                    onClick={() => setTickets(Math.max(1, tickets - 1))}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white transition hover:bg-[#D6F064] dark:bg-[#202B24] dark:text-white dark:hover:bg-[#D6F064] dark:hover:text-[#18251C]"
                    aria-label="Remove a spot"
                  >
                    <Icon name="minus" className="h-4 w-4" />
                  </button>
                  <span className="w-3 text-center text-sm font-bold dark:text-white">{tickets}</span>
                  <button
                    onClick={() => setTickets(Math.min(8, tickets + 1))}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white transition hover:bg-[#D6F064] dark:bg-[#202B24] dark:text-white dark:hover:bg-[#D6F064] dark:hover:text-[#18251C]"
                    aria-label="Add a spot"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="py-6">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold dark:text-white">Ticket price</p>
                  <span className="text-xs text-[#858B81] dark:text-[#9BA399]">KSh</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#7B8179] dark:text-[#9BA399]">
                  KSh 800 per person, or KSh 1,500 for two.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#DAD8D0] dark:border-white/15 dark:bg-[#0F1512] px-3 py-3 text-center">
                    <p className="text-sm font-bold dark:text-white">KSh 800</p>
                    <p className="mt-1 text-xs text-[#7B8179] dark:text-[#9BA399]">1 person</p>
                  </div>
                  <div className="rounded-xl border border-[#214E42] bg-[#214E42] dark:bg-[#1E3A32] dark:border-[#2E584C] px-3 py-3 text-center text-white">
                    <p className="text-sm font-bold">KSh 1,500</p>
                    <p className="mt-1 text-xs text-white/75">2 people</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F3F0E7] dark:bg-[#0F1512] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6E756C] dark:text-[#9BA399]">
                    {tickets} {tickets === 1 ? 'spot' : 'spots'}
                  </span>
                  <span className="font-semibold dark:text-white">{formatPrice(total)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-[#1C211C]/10 dark:border-white/10 pt-3">
                  <span className="font-semibold dark:text-white">Total</span>
                  <span className="text-xl font-bold tracking-[-0.03em] dark:text-white">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={openPayment}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#4CAF50] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#43A047] active:scale-[0.99]"
              >
                <MpesaIcon />
                Pay via M-Pesa
              </button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#858B81] dark:text-[#9BA399]">
                <Icon name="lock" className="h-3.5 w-3.5" />
                Secure M-Pesa payment · Full refund until Aug 22
              </p>
            </div>
            <div className="mt-4 rounded-[22px] border border-[#1C211C]/10 dark:border-white/10 dark:bg-[#161F1A]/60 p-5">
              <p className="text-sm font-semibold dark:text-white">Have a question?</p>
              <p className="mt-1 text-xs leading-5 text-[#767D74] dark:text-[#9BA399]">
                Our FriendsUp team is happy to help before you join.
              </p>
              <button className="mt-3 text-sm font-bold text-[#214E42] dark:text-[#D6F064] underline decoration-[#214E42]/30 dark:decoration-[#D6F064]/30 underline-offset-4">
                Contact FriendsUp
              </button>
            </div>
          </aside>
        )}
      </div>
    </main>

      {paymentOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#101610]/65 dark:bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="M-Pesa payment"
        >
          <div className="w-full max-w-md rounded-t-[30px] bg-[#FFFDF7] dark:bg-[#151D18] dark:border dark:border-white/10 shadow-2xl sm:rounded-[30px] overflow-hidden">

            {/* M-Pesa header bar */}
            <div className="flex items-center justify-between bg-[#4CAF50] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <MpesaIcon />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                    {mpesaStep === 'phone' ? 'Secure checkout' : mpesaStep === 'waiting' ? 'Processing' : 'Payment confirmed'}
                  </p>
                  <p className="text-base font-semibold text-white leading-tight">
                    {mpesaStep === 'phone' ? 'Pay via M-Pesa' : mpesaStep === 'waiting' ? 'Check your phone…' : 'Payment received!'}
                  </p>
                </div>
              </div>
              <button
                onClick={closePayment}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Order summary pill */}
              <div className="flex items-center gap-3 rounded-2xl bg-[#F3F0E7] dark:bg-[#0E1511] px-4 py-3 mb-5">
                <img src={heroImage} alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold dark:text-white">FriendsUp Movie Night — Edition One</p>
                  <p className="text-xs text-[#777E75] dark:text-[#9BA399]">{tickets} {tickets === 1 ? 'spot' : 'spots'} · Sat, Aug 24</p>
                </div>
                <span className="font-bold text-sm flex-shrink-0 dark:text-white">{formatPrice(total)}</span>
              </div>

              {/* Step: phone */}
              {mpesaStep === 'phone' && (
                <div className="space-y-4">

                  {/* M-Pesa phone number */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Safaricom M-Pesa number</p>
                    <div className={`flex items-center rounded-xl border-2 overflow-hidden transition-colors ${
                      phoneError ? 'border-red-400' : 'border-[#DAD8D0] dark:border-white/15 focus-within:border-[#4CAF50]'
                    }`}>
                      <span className="bg-[#F3F0E7] dark:bg-[#0E1511] px-3 py-3.5 text-sm font-semibold text-[#555] dark:text-[#CBD3CC] border-r border-[#DAD8D0] dark:border-white/15 select-none whitespace-nowrap">🇰🇪 +254</span>
                      <input
                        id="mpesa-phone"
                        type="tel"
                        placeholder="712 345 678"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                        className="flex-1 bg-transparent px-4 py-3.5 text-sm outline-none tracking-wide dark:text-white dark:placeholder-white/40"
                        autoComplete="tel"
                      />
                    </div>
                    {phoneError && <p className="mt-1.5 text-xs text-red-500 font-medium">{phoneError}</p>}
                    <p className="mt-1.5 text-[11px] text-[#858B81] dark:text-[#9BA399] leading-5">An STK push will be sent here — enter your M-Pesa PIN when prompted.</p>
                  </div>

                  {/* Email for receipt */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Email for receipt</p>
                    <input
                      id="mpesa-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError('') }}
                      onKeyDown={e => e.key === 'Enter' && submitPhone()}
                      className={`w-full rounded-xl border-2 px-4 py-3.5 text-sm outline-none transition-colors dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 ${
                        emailError ? 'border-red-400' : 'border-[#DAD8D0] dark:border-white/15 focus:border-[#4CAF50]'
                      }`}
                      autoComplete="email"
                    />
                    {emailError && <p className="mt-1.5 text-xs text-red-500 font-medium">{emailError}</p>}
                    <p className="mt-1 text-[11px] text-[#858B81] dark:text-[#9BA399]">We'll send your ticket confirmation and receipt here.</p>
                  </div>

                  <button
                    id="mpesa-send-btn"
                    onClick={submitPhone}
                    className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#4CAF50] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#43A047] active:scale-[0.98]"
                  >
                    <MpesaIcon />
                    Send M-Pesa Request · {formatPrice(total)}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#858B81] dark:text-[#9BA399]">
                    <Icon name="lock" className="h-3 w-3" />
                    Encrypted · Full refund until Aug 22
                  </p>
                </div>
              )}

              {/* Step: waiting for STK push */}
              {mpesaStep === 'waiting' && (
                <div className="py-4 text-center">
                  <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                    {/* Spinner ring */}
                    <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="#E8F5E9" strokeWidth="6" className="dark:stroke-white/10" />
                      <circle cx="48" cy="48" r="42" fill="none" stroke="#4CAF50" strokeWidth="6"
                        strokeDasharray="200" strokeDashoffset="130" strokeLinecap="round" />
                    </svg>
                    <span className="text-3xl">📱</span>
                  </div>
                  <p className="text-base font-semibold tracking-[-0.02em] dark:text-white">Check your phone</p>
                  <p className="mt-2 text-sm leading-6 text-[#6D746B] dark:text-[#A4ACA2] max-w-xs mx-auto">
                    An M-Pesa prompt has been sent to <strong className="text-[#1C211C] dark:text-white">{phone || '0712 345 678'}</strong>. Enter your PIN to complete the payment.
                  </p>
                  <div className="mt-5 rounded-2xl bg-[#F3F0E7] dark:bg-[#0E1511] px-5 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6E756C] dark:text-[#9BA399]">Amount</span>
                      <span className="font-bold dark:text-white">{formatPrice(total)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#858B81] dark:text-[#9BA399]">
                      <span>Paybill / Till</span>
                      <span className="font-semibold text-[#1C211C] dark:text-white">FriendsUp Events</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-[#858B81] dark:text-[#9BA399]">Waiting for confirmation…</p>
                </div>
              )}

              {/* Step: confirmed */}
              {mpesaStep === 'confirmed' && (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-[#4CAF50] text-white shadow-[0_8px_24px_rgba(76,175,80,0.4)]">
                    <Icon name="check" className="h-9 w-9" />
                  </div>
                  <p className="text-base font-semibold tracking-[-0.02em] dark:text-white">Payment successful 🎉</p>
                  <p className="mt-2 text-sm leading-6 text-[#6D746B] dark:text-[#A4ACA2] max-w-xs mx-auto">
                    KSh {total.toLocaleString('en-KE')} received from {phone || '0712 345 678'}. Your {tickets === 1 ? 'spot is' : `${tickets} spots are`} confirmed!
                  </p>
                  <div className="mt-5 rounded-2xl border border-[#4CAF50]/30 bg-[#F1F8F1] dark:bg-[#0E2015] px-5 py-4 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4CAF50] mb-2">M-Pesa receipt</p>
                    <div className="flex justify-between text-xs text-[#555] dark:text-[#A4ACA2] mb-1">
                      <span>Transaction ID</span><span className="font-semibold text-[#1C211C] dark:text-white">QJ{Math.floor(Math.random()*9000+1000)}XWRT</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#555] dark:text-[#A4ACA2]">
                      <span>Date</span><span className="font-semibold text-[#1C211C] dark:text-white">Sat, 24 Aug 2024</span>
                    </div>
                  </div>
                  <button
                    id="mpesa-done-btn"
                    onClick={closePayment}
                    className="mt-5 w-full rounded-full bg-[#214E42] dark:bg-[#D6F064] dark:text-[#18251C] px-5 py-4 text-sm font-bold text-white hover:bg-[#183B30] dark:hover:bg-[#C4E14E] transition"
                  >
                    Done — see you there! 🎬
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth modal */}
      {authOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#101610]/60 dark:bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={authTab === 'login' ? 'Log in' : 'Sign up'}
          onClick={e => { if (e.target === e.currentTarget) setAuthOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-t-[30px] bg-[#FFFDF7] dark:bg-[#151D18] dark:border dark:border-white/10 shadow-2xl sm:rounded-[30px] overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-[#E8E4DA] dark:border-white/10">
              {(['login', 'signup'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAuthTab(tab)}
                  className={`flex-1 py-4 text-sm font-bold tracking-[-0.01em] transition ${
                    authTab === tab
                      ? 'text-[#1C211C] dark:text-white border-b-2 border-[#214E42] dark:border-[#D6F064]'
                      : 'text-[#858B81] dark:text-[#7C857E] hover:text-[#1C211C] dark:hover:text-white'
                  }`}
                >
                  {tab === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
              <button
                onClick={() => setAuthOpen(false)}
                className="px-5 text-[#858B81] dark:text-[#9BA399] hover:text-[#1C211C] dark:hover:text-white transition"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {authTab === 'login' ? (
                <form onSubmit={e => { e.preventDefault(); setAuthOpen(false) }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Email</label>
                    <input
                      id="auth-login-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border-2 border-[#DAD8D0] dark:border-white/15 dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#214E42] dark:focus:border-[#D6F064]"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Password</label>
                    <input
                      id="auth-login-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border-2 border-[#DAD8D0] dark:border-white/15 dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#214E42] dark:focus:border-[#D6F064]"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#214E42] dark:text-[#D6F064] underline underline-offset-4 decoration-[#214E42]/30 dark:decoration-[#D6F064]/30"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="submit"
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#1C211C] dark:bg-[#D6F064] dark:text-[#18251C] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#214E42] dark:hover:bg-[#C4E14E]"
                  >
                    Log in
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                  <p className="text-center text-xs text-[#858B81] dark:text-[#9BA399]">
                    No account?{' '}
                    <button type="button" onClick={() => setAuthTab('signup')} className="font-bold text-[#214E42] dark:text-[#D6F064] underline underline-offset-4 decoration-[#214E42]/30 dark:decoration-[#D6F064]/30">
                      Sign up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setAuthOpen(false) }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Email</label>
                    <input
                      id="auth-signup-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border-2 border-[#DAD8D0] dark:border-white/15 dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#214E42] dark:focus:border-[#D6F064]"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Password</label>
                    <input
                      id="auth-signup-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full rounded-xl border-2 border-[#DAD8D0] dark:border-white/15 dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#214E42] dark:focus:border-[#D6F064]"
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-[11px] text-[#858B81] dark:text-[#9BA399]">Minimum 8 characters.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#747B72] dark:text-[#9BA399] mb-2">Confirm password</label>
                    <input
                      id="auth-signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border-2 border-[#DAD8D0] dark:border-white/15 dark:bg-[#0E1511] dark:text-white dark:placeholder-white/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#214E42] dark:focus:border-[#D6F064]"
                      autoComplete="new-password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#214E42] dark:bg-[#D6F064] dark:text-[#18251C] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#183B30] dark:hover:bg-[#C4E14E]"
                  >
                    Create account
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                  <p className="text-center text-xs text-[#858B81] dark:text-[#9BA399]">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setAuthTab('login')} className="font-bold text-[#214E42] dark:text-[#D6F064] underline underline-offset-4 decoration-[#214E42]/30 dark:decoration-[#D6F064]/30">
                      Log in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {page === 'home' && (
        <div className="group fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {/* Hover menu — slides up and fades in */}
          <div className="pointer-events-none flex flex-col items-end gap-2 opacity-0 translate-y-2 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
            <a
              href="https://wa.me/254700000000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-full bg-white dark:bg-[#161F1A] px-4 py-2.5 text-sm font-semibold text-[#1C211C] dark:text-white dark:border dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition hover:bg-[#F0FDF4] dark:hover:bg-[#1D2921] hover:text-[#25D366]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]" aria-hidden="true">
                <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2 12H6v-2h12v2Zm0-3H6V9h12v2Zm0-3H6V6h12v2Z"/>
              </svg>
              Chat with us
            </a>
            {whatsappCommunityUrl ? (
              <a
                href={whatsappCommunityUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-full bg-white dark:bg-[#161F1A] px-4 py-2.5 text-sm font-semibold text-[#1C211C] dark:text-white dark:border dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition hover:bg-[#F0FDF4] dark:hover:bg-[#1D2921] hover:text-[#25D366]"
              >
                <WhatsAppIcon small />
                Join our WhatsApp community
              </a>
            ) : (
              <span className="flex items-center gap-2.5 rounded-full bg-white dark:bg-[#161F1A] px-4 py-2.5 text-sm font-semibold text-[#1C211C] dark:text-white dark:border dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.12)] opacity-60 cursor-not-allowed select-none">
                <WhatsAppIcon small />
                Join our WhatsApp community
              </span>
            )}
          </div>

          {/* WhatsApp FAB */}
          <button
            type="button"
            aria-label="WhatsApp menu"
            className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_6px_28px_rgba(37,211,102,0.45)] transition duration-200 hover:scale-105 hover:bg-[#1EBE5D] active:scale-95"
          >
            <WhatsAppIcon />
          </button>
        </div>
      )}
    </div>
  )
}

function WhatsAppIcon({ small }: { small?: boolean } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={small ? 'h-4 w-4' : 'h-7 w-7'} fill="currentColor">
      <path d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.4 28.6l6.3-1.7A12.8 12.8 0 1 0 16 3.2Zm0 23.2c-2 0-4-.5-5.7-1.6l-.4-.2-3.7 1 1-3.6-.3-.4A10.3 10.3 0 1 1 16 26.4Zm5.7-7.7c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.4 8.4 0 0 1-2.5-1.5 9.3 9.3 0 0 1-1.7-2.1c-.2-.3 0-.5.2-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3a13 13 0 0 0 5 4.4c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6 0 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  )
}

function MpesaIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-5 w-5" fill="currentColor">
      <circle cx="20" cy="20" r="20" fill="#fff" opacity="0.15" />
      <text x="20" y="26" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff" fontFamily="Arial,sans-serif">M</text>
    </svg>
  )
}
