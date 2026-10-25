import { motion } from 'framer-motion';
import sketchIcon from '@/assets/Sketch Icon.png';
import bustIcon from '@/assets/Bust Icon.png';
import halfbodyIcon from '@/assets/Halfbody Icon.png';
import fullbodyIcon from '@/assets/Fullbody Icon.png';
import illustrationIcon from '@/assets/Illustration Icon.png';

export const PricingSection = () => {
  const features = [
        {
      image: sketchIcon,
      imageScale: '75%',
      title: 'Surprise Me! Sketch',
      price: '$25.00',
      description: 'I pick the pose and create a non-colored sketch of your character. There are no revisions for this option, unless I miss a key detail of your character. Intricate details may be simplified or omitted.'
    },
    {
      image: bustIcon,
      imageScale: '120%',
      title: 'Bust',
      price: '$50.00',
      description: "Includes the character's head, shoulders, and upper torso."
    },
    {
      image: halfbodyIcon,
      title: 'Halfbody',
      price: '$75.00',
      description: 'Includes everything from the head to the waist + the arms and hands.'
    },
    {
      image: fullbodyIcon,
      title: 'Fullbody',
      price: '$100.00',
      description: 'Includes everything from the head to the feet.'
    },
    {
      image: illustrationIcon,
      title: 'Illustration',
      price: '$200.00',
      description: 'A detailed illustration of the character with a supporting background and/or elements to help tell the story.'
    }
  ];

  return (
    <section className="py-8 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
              <p className="font-display text-2xl text-gold mb-4">
              <b>Please Note:</b> I cannot guarantee a solid deadline as I have a full
                 time job that takes priority. I strive to give my all in each commission; please remain patient throughout the creative process.
              </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
            <span className="text-gradient italic">Pricing</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              All pricing and payments are made in USD. I will only accept payments through <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">PayPal</span>.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Please provide <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent italic">visually</span> clear and detailed references to ensure the best possible outcome for your commission. The more references the better! I will not work off of written descriptions alone.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Complex armor, weapons, or other intricate details may incur additional charges. Any extra characters, mounts, or pets will add <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">25-50%</span> to the base price. Final price will be agreed upon before starting the commission.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">No AI</span> is used to create any artwork. All commissions are hand-drawn by me.
            </p>
          </motion.div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
                className="flex gap-4 p-6 rounded-xl bg-secondary/30 border border-border/50 hover:border-gold/30 transition-colors duration-300"
              >
                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gold/10 overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="w-full h-full bg-current text-gold"
                    style={{
                      maskImage: `url("${feature.image}")`,
                      WebkitMaskImage: `url("${feature.image}")`,
                      maskSize: feature.imageScale ?? 'contain',
                      WebkitMaskSize: feature.imageScale ?? 'contain',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                    }}
                  />
                </div>
                <div>
                  <h2 className="font-display text-lg text-foreground mb-1">{feature.title} - <b className="font-display text-2xl text-foreground text-gold mb-1">{feature.price}</b></h2>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
