import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportPdfButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  label?: string;
};

export function ExportPdfButton({
  onClick,
  disabled = false,
  loading = false,
  className,
  title,
  label = 'PDF',
}: ExportPdfButtonProps) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" className={className} disabled={disabled || loading} title={title}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {label}
    </Button>
  );
}
