import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Seal3D - Client-Side File Encryption';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#09090b',
                    backgroundImage: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 160,
                        height: 160,
                        borderRadius: 32,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                        marginBottom: 40,
                    }}
                >
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12 2L4 6V11C4 16 7.5 20.5 12 21.5C16.5 20.5 20 16 20 11V6L12 2Z"
                            fill="white"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: 16,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Seal3D
                </div>
                <div
                    style={{
                        fontSize: 32,
                        color: '#a1a1aa',
                        textAlign: 'center',
                        maxWidth: 800,
                        lineHeight: 1.4,
                    }}
                >
                    Client-Side File Encryption Powered by Web Crypto API
                </div>
                <div
                    style={{
                        fontSize: 24,
                        color: '#71717a',
                        marginTop: 32,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <span>🔒 AES-256-GCM</span>
                    <span>·</span>
                    <span>✨ No Server Upload</span>
                    <span>·</span>
                    <span>⚡ 100% Client-Side</span>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}

