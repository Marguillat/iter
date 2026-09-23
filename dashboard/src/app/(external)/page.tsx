import type { Metadata } from 'next'

import { permanentRedirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Iter',
  description: '',
}

export default function Home() {
  permanentRedirect('/dashboard/default')
  // Keeps landing-page colors independent from saved dashboard theme presets.
  // return (
  //   <main
  //     className={`${styles.landing} min-h-screen bg-background text-foreground`}
  //     data-landing-page
  //   >
  //     <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:gap-8 sm:p-6 md:p-8'>
  //       <header className='flex items-start justify-between gap-4 sm:items-center sm:gap-6'>
  //         <Link
  //           className='font-medium text-base tracking-tight'
  //           href='/'
  //           aria-label='Studio Admin home'
  //           prefetch={false}
  //         >
  //           Studio Admin
  //         </Link>
  //         <LandingThemeSwitcher />
  //       </header>
  //       <Intro />
  //       <Showcase />
  //       <Separator />
  //       <Overview />
  //       <Separator />
  //       <Footer />
  //     </div>
  //   </main>
  // )
}
