import React from "react";

import poster from "../assets/ganeshaa.png";
import heroVideo from "../assets/ganeshavideo.mp4";

const HeroVideoWithFeatures: React.FC = () => {
  return (
    <div>
      
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={heroVideo}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        </section>
        </div>
  )  
}
export default HeroVideoWithFeatures;
