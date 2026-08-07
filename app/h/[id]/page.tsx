import { redirect } from 'next/navigation';

export default function HandshakeRoomPage({ params }: { params: { id: string } }) {
  redirect(`/?hs=${encodeURIComponent(params.id)}`);
}
