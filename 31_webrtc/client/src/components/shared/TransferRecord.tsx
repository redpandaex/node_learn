import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, X } from 'lucide-react';
import { FileTransfer } from '@/types/webRTC';
import { TransferItem } from './TransferItem';

interface TransferHistoryProps {
  transfers: FileTransfer[];
  onDownload: (transferId: string) => void;
  onRemove: (transferId: string) => void;
  onPause?: (transferId: string) => void;
  onResume?: (transferId: string) => void;
  onCancel?: (transferId: string) => void;
  onClearAll: () => void;
  isMobile?: boolean;
}

export function TransferRecord({
  transfers,
  onDownload,
  onRemove,
  onPause,
  onResume,
  onCancel,
  onClearAll,
  isMobile = false,
}: TransferHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            传输记录
          </span>
          {transfers.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant={isMobile ? 'ghost' : 'outline'} size="sm">
                  {isMobile ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      清除所有
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要清除所有传输记录吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll}>
                    确认清除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p
            className={`text-muted-foreground text-center ${isMobile ? 'py-4' : 'py-8'}`}
          >
            暂无传输记录
          </p>
        ) : (
          <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            {transfers.map((transfer) => (
              <TransferItem
                key={transfer.id}
                transfer={transfer}
                onDownload={onDownload}
                onRemove={onRemove}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
