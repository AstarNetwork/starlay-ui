import { Web3ReactProvider } from '@web3-react/core'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, VFC } from 'react'
import { isMobile } from 'react-device-detect'
import TagManager from 'react-gtm-module'
import { Favicons } from 'src/components/parts/Favicons'
import { SEO } from 'src/components/parts/SEO'
import { COMMON_SEO_DATA } from 'src/constants/seo'
import { swrFallback } from 'src/hooks/swrFallback'
import { ModalPortal } from 'src/hooks/useModal'
import { I18nProvider, loadSync } from 'src/libs/i18n-provider'
import { getLibrary } from 'src/libs/wallet-provider'
import { Locale } from 'src/locales'
import { notoSansJpPath } from 'src/styles/font'
import { GlobalStyles } from 'src/styles/global-styles'
import 'src/styles/globals.css'
import 'src/styles/lato_fonts.css'
import 'src/styles/reset.css'
import { PageStaticProps } from 'src/types/page'
import { GTM_ID } from 'src/utils/env'
import { SORRY, sorryFor } from 'src/utils/routes'
import { SWRConfig } from 'swr'

const MyApp: VFC<Omit<AppProps, 'pageProps'> & { pageProps: PageStaticProps }> =
  ({ Component, pageProps, router }) => {
    const jumpToSorry = isMobile && router.pathname !== SORRY
    useEffect(() => {
      if (GTM_ID) TagManager.initialize({ gtmId: GTM_ID })
      if (jumpToSorry) router.replace(sorryFor('mobile-not-supported'))
    }, [])
    loadSync(router.locale as Locale)
    return (
      <>
        <GlobalStyles />
        <Favicons />
        <Head>
          <link href={notoSansJpPath} />
        </Head>
        <SWRConfig value={{ fallback: swrFallback(pageProps) }}>
          <Web3ReactProvider getLibrary={getLibrary}>
            <I18nProvider>
              <SEO {...COMMON_SEO_DATA} {...pageProps.seoProps} />
              {!jumpToSorry && (
                <Component {...(pageProps as any)} router={router} />
              )}
              <ModalPortal />
            </I18nProvider>
          </Web3ReactProvider>
        </SWRConfig>
      </>
    )
  }

export default MyApp
