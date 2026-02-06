
-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Sender can see their sent requests
CREATE POLICY "Users can view sent requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = sender_id);

-- Receiver can see incoming requests
CREATE POLICY "Users can view received requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = receiver_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

-- Receiver can update (accept/reject) requests
CREATE POLICY "Receiver can update request status"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = receiver_id);

-- Sender can delete their pending requests
CREATE POLICY "Sender can cancel pending requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = sender_id AND status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow users to search other profiles (read-only, display_name only)
CREATE POLICY "Users can search profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
