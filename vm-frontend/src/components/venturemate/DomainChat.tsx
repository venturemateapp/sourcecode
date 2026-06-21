import { AIChatPanel } from './AIChatPanel';

interface DomainChatProps {
  domain: string;
  placeholder?: string;
}

export function DomainChat({ domain, placeholder }: DomainChatProps) {
  return <AIChatPanel domain={domain} placeholder={placeholder} mode="floating" />;
}
