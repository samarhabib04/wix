'use client';

import { useParams } from 'next/navigation';
import { ConversationView } from '@/components/messaging/ConversationView';

export default function BuyerConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;

  return (
    <div>
      <ConversationView conversationId={conversationId} />
    </div>
  );
}




























