import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LoadingScreen = () => {
  return (
    <div style={styles.container}>
      <DotLottieReact
        src="https://lottie.host/f7576cbf-c397-49fe-aa28-8b518c0e7d07/RZUAWqVfn8.lottie"
        autoplay
        loop
        style={styles.animation}
      />
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#ffffff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: "10rem",
    height: "10rem",
  },
};

export default LoadingScreen;
