
import HeroSection from '../components/Hero'
import FestiveCorner from '../components/FestiveSection'
import About from '../components/About'
import CollectionsSection from '../components/ProductSession'
import Footer from '../components/Footer'
import AstrotalkTeaser from '../components/Astrotalklanding'
import EssenceHero from '../components/HeroSection'

const LandingPage = () => {
  return (
   <div>
    <HeroSection/>
    <EssenceHero/>
   <FestiveCorner/>
   <About/>
   <CollectionsSection/>
   <AstrotalkTeaser/>
   <Footer/>
   </div>
  )
}

export default LandingPage