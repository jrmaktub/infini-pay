
import { Shield, Check } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  passCode?: string | null;
  className?: string;
}

const VerificationBadge = ({ isVerified, passCode, className = "" }: VerificationBadgeProps) => {
  if (!isVerified) return null;

  return (
    <div className={`flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30 ${className}`}>
      <Shield className="text-green-400" size={16} />
      <span className="text-green-400 text-sm font-medium">Verified Próspera Citizen</span>
      <Check className="text-green-400" size={16} />
    </div>
  );
};

export default VerificationBadge;
