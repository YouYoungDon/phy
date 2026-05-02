import Lottie from "lottie-react";
import sobakIdle from "../../assets/characters/sobak-idle.json";

export default function SobakLottie() {
  return (
    <div style={{ width: "100%", maxWidth: 280, margin: "0 auto" }}>
      <Lottie animationData={sobakIdle} loop={true} autoplay={true} />
    </div>
  );
}
