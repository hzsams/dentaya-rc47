'use client';
import UiMessage from '@/lib/i18n/UiMessage';
import UserText from '@/lib/i18n/UserText';
import {notificationBodyMessage,type NotificationText} from '@/lib/system-messages';

export default function SystemNotificationBody({row}:{row:NotificationText}) {
  const message=notificationBodyMessage(row);
  return message?<UiMessage {...message}/>:<UserText>{row.body}</UserText>;
}
