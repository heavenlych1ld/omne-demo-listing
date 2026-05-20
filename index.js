export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/listing-demo/index.html",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}
