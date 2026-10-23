import { Intro } from '@/components/intro/Intro'
import { ACCESS_TOKEN_STORAGE_KEY } from '@/api/auth-token'
import { routes } from '@/shared/config/routes'

export default function HomePage() {
    return (
        <>
            <Intro />
            <script
                id="intro-redirect"
                dangerouslySetInnerHTML={{
                    __html: `(() => {
                        const intro = document.getElementById('atimi-intro');
                        if (!intro) return;
                        window.__atimiIntro ??= new WeakSet();
                        window.__atimiIntro.add(intro);
                        window.setTimeout(() => {
                            if (!intro.isConnected || window.location.pathname !== '/') return;
                            let destination = ${JSON.stringify(routes.auth)};
                            try {
                                if (window.localStorage.getItem(${JSON.stringify(ACCESS_TOKEN_STORAGE_KEY)})) destination = ${JSON.stringify(routes.main)};
                            } catch {
                                destination = ${JSON.stringify(routes.auth)};
                            }
                            window.location.replace(destination);
                        }, 1000);
                    })();`,
                }}
            />
        </>
    )
}
