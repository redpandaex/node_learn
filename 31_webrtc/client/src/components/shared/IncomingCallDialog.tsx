import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../ui/alert-dialog';

interface IncomingCallDialogProps {
  isOpen: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  isOpen,
  callerName,
  onAccept,
  onReject,
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-500" />
            视频通话邀请
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="text-center py-4">
              <div className="text-lg font-medium mb-2">
                {callerName} 邀请您进行视频通话
              </div>
              <div className="text-sm text-gray-500">
                点击接受开始通话，或者拒绝通话邀请
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center gap-6">
          <Button
            onClick={onReject}
            variant="destructive"
            size="lg"
            className="flex items-center gap-2 px-8"
          >
            <PhoneOff className="h-5 w-5" />
            拒绝
          </Button>
          <Button
            onClick={onAccept}
            variant="default"
            size="lg"
            className="flex items-center gap-2 px-8 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-5 w-5" />
            接受
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IncomingCallDialog;
