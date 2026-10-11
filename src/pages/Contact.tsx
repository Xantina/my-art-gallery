import { useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageTransition } from '@/components/PageTransition';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContactVerification } from '@/components/ContactVerification';

const readImage = (file: File): Promise<{ filename: string; content: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ filename: file.name, content: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(new Error('Could not read an image. Please select it again.'));
    reader.readAsDataURL(file);
  });

const Contact = () => {
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceLinks, setReferenceLinks] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [verificationReset, setVerificationReset] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error('Contact form unavailable', { description: 'Please email cheyroach@gmail.com to get in touch.' });
      return;
    }

    if (isSubmitting) return;
    if (!turnstileToken) {
      toast.error('Please complete the verification before sending.');
      return;
    }
    setIsSubmitting(true);

    try {
      const links = referenceLinks.split(/\r?\n/).map(link => link.trim()).filter(Boolean);
      if (links.length > 10 || links.some(link => {
        try {
          const url = new URL(link);
          return url.protocol !== 'https:' || !!url.username || !!url.password || link.length > 2048;
        } catch { return true; }
      })) throw new Error('Add up to 10 valid HTTPS reference links, one per line.');

      const attachments = await Promise.all(referenceFiles.map(readImage));
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: { ...formData, referenceLinks: links, attachments, turnstileToken }
      });

      if (error) {
        let details = 'Failed to send message. Please try again.';
        if ('context' in error && error.context instanceof Response && [400, 403, 503].includes(error.context.status)) {
          const body = await error.context.json().catch(() => null);
          if (typeof body?.error === 'string') details = body.error;
        }
        throw new Error(details);
      }

      toast.success('Message sent!', { description: "Thank you for your message. I'll get back to you soon." });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setReferenceFiles([]);
      setReferenceLinks('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (error: unknown) {
      
      toast.error('Message not sent', { description: error instanceof Error ? error.message : 'Failed to send message. Please email cheyroach@gmail.com.' });
    } finally {
      setTurnstileToken('');
      setVerificationReset(value => value + 1);
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <PageTransition>
    <div className="min-h-screen relative overflow-hidden">
      
      <Header />
      <main className="pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-6">
              Get in <span className="text-gradient">Touch</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Interested in commissioning a piece or have questions about my work? 
              I'd love to hear from you.
            </p>
          </div>

          <div className="w-full max-w-2xl mx-auto">
            

            {/* Contact Form */}
            <div className="p-8 rounded-2xl bg-card border border-border">
              <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
                Send a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={isSubmitting} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="Your email"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="Commission request, question, etc."
                  />
                </div>


                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
                    placeholder="Tell me about your commission request or inquiry..."
                  />
                </div>

                <div>
                  <label htmlFor="reference-images" className="block text-sm font-medium text-foreground mb-2">
                    Reference images (optional)
                  </label>
                  <input
                    ref={fileInput}
                    id="reference-images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    aria-describedby="reference-images-help"
                    className="w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-3 file:text-secondary-foreground"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 5 || files.some(file => !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) {
                        toast.error('Check your reference images', { description: 'Choose up to 5 JPG, PNG, GIF, or WebP images. Maximum 5 MB each and 10 MB combined.' });
                        e.target.value = '';
                        setReferenceFiles([]);
                        return;
                      }
                      setReferenceFiles(files);
                    }}
                  />
                  <p id="reference-images-help" className="text-muted-foreground text-sm mt-2">
                    Up to 5 JPG, PNG, GIF, or WebP images. Maximum 5 MB each, 10 MB combined.
                  </p>
                  {referenceFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {referenceFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground break-all">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button type="button" className="text-gold" aria-label={`Remove ${file.name}`} onClick={() => {
                            setReferenceFiles(files => files.filter((_, i) => i !== index));
                            if (fileInput.current) fileInput.current.value = '';
                          }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="reference-links" className="block text-sm font-medium text-foreground mb-2">
                    Reference links (optional)
                  </label>
                  <textarea
                    id="reference-links"
                    value={referenceLinks}
                    onChange={e => setReferenceLinks(e.target.value)}
                    rows={3}
                    maxLength={20500}
                    aria-describedby="reference-links-help"
                    placeholder="https://docs.google.com/..."
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                  <p id="reference-links-help" className="text-muted-foreground text-sm mt-2">
                    Add up to 10 HTTPS links, one per line, such as Google Docs, Google Drive, or Dropbox. Set sharing permissions so I can view your references.
                  </p>
                </div>

                <ContactVerification onToken={setTurnstileToken} resetKey={verificationReset} />

                <button
                  type="submit"
                  disabled={isSubmitting || !turnstileToken}
                  className="w-full btn-gold py-4 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </PageTransition>
  );
};

export default Contact;
