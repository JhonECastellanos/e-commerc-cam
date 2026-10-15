import { Link } from 'react-router-dom';
import { useCommercialContact } from '../../hooks/useCommercialContact';
import { whatsappURL } from '../../utils/whatsapp';
export default function WhatsappCTA({ message, children = 'Cotizar por WhatsApp', className = 'commerce-button commerce-button-green' }: {
  message: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const href = whatsappURL(useCommercialContact(), message);
  return href ? <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a> : <Link to="/asesoria" className={className}>Solicitar cotización</Link>;
}
