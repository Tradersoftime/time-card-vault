import { useState } from 'react';
import { MessageCircle, Send, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { value: 'general', label: 'General Question' },
  { value: 'card_issue', label: 'Card Issue' },
  { value: 'redemption', label: 'Redemption Problem' },
  { value: 'account', label: 'Account Help' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

export default function HelpCenter() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!category || !subject.trim() || !message.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        user_email: user.email || '',
        category,
        subject: subject.trim(),
        message: message.trim(),
        page_url: window.location.href,
      });

      if (error) throw error;

      toast({ title: 'Ticket submitted!', description: 'We\'ll get back to you soon.' });
      setCategory('');
      setSubject('');
      setMessage('');
    } catch (err) {
      toast({ title: 'Failed to submit ticket', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">Help Center</h1>
          <p className="text-muted-foreground text-lg">
            Need assistance? We're here to help.
          </p>
        </div>

        {/* How to get support */}
        <div className="glass-panel rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How to Get Support</h2>
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-foreground mb-2">
                <strong>Quick Access:</strong> Use the floating <span className="text-primary font-medium">feedback button</span> in the bottom-right corner of any page to quickly submit a ticket.
              </p>
              <p className="text-muted-foreground text-sm">
                Or fill out the form below to submit a support ticket directly from this page.
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Form */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Submit a Ticket</h2>
          
          {user ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  rows={5}
                  maxLength={2000}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Submitting...' : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Please log in to submit a support ticket.
              </p>
              <Button asChild>
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
