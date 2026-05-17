import type { GetServerSideProps } from 'next';

// Primary Meta Tags
<head>

<html lang="en">
<title>Create, Publish, Go Live, and Earn</title>
<meta name="title" content="Create, Publish, Go Live, and Earn" />
<meta name="description" content="Create, publish, go live, and earn with Verrsa. The ultimate platform for content creators." />

{/* <!-- Open Graph / Facebook --> */}
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.verrsa.org/" />
<meta property="og:title" content="Create, Publish, Go Live, and Earn" />
<meta property="og:description" content="Create, publish, go live, and earn with Verrsa. The ultimate platform for content creators." />
<meta property="og:image" content="https://ik.imagekit.io/te9biwxvl/verrsa-team.png" />

{/* <!-- X (Twitter) --> */}
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="https://www.verrsa.org/" />
<meta property="twitter:title" content="Create, Publish, Go Live, and Earn" />
<meta property="twitter:description" content="Create, publish, go live, and earn with Verrsa. The ultimate platform for content creators." />
<meta property="twitter:image" content="https://ik.imagekit.io/te9biwxvl/verrsa-team.png" />

</html>
</head>


export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/landing',
      permanent: false,
    },
  };
};

export default function IndexRedirect() {
  return null;
}
