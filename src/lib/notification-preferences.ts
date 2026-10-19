import { supabase } from "@/lib/supabase";

export type NotificationCategory =
  | "case"
  | "design"
  | "finance"
  | "delivery"
  | "message"
  | "system";

export type NotificationPreferences = {
  case_enabled: boolean;
  design_enabled: boolean;
  finance_enabled: boolean;
  delivery_enabled: boolean;
  message_enabled: boolean;
  system_enabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  case_enabled: true,
  design_enabled: true,
  finance_enabled: true,
  delivery_enabled: true,
  message_enabled: true,
  system_enabled: true,
};

export function categoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory
) {
  const key =
    `${category}_enabled` as keyof NotificationPreferences;

  return Boolean(preferences[key]);
}

export async function loadNotificationPreferences(
  userId?: string
): Promise<NotificationPreferences> {
  let resolvedUserId =
    userId ?? "";

  if (!resolvedUserId) {
    const { data } =
      await supabase.auth.getSession();

    resolvedUserId =
      data.session?.user.id ?? "";
  }

  if (!resolvedUserId) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const { data } =
    await supabase
      .from("user_notification_preferences")
      .select(
        "case_enabled,design_enabled,finance_enabled,delivery_enabled,message_enabled,system_enabled"
      )
      .eq(
        "user_id",
        resolvedUserId
      )
      .maybeSingle();

  if (!data) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    case_enabled:
      Boolean(data.case_enabled),
    design_enabled:
      Boolean(data.design_enabled),
    finance_enabled:
      Boolean(data.finance_enabled),
    delivery_enabled:
      Boolean(data.delivery_enabled),
    message_enabled:
      Boolean(data.message_enabled),
    system_enabled:
      Boolean(data.system_enabled),
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
) {
  const { error } =
    await supabase
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (error) {
    throw error;
  }

  if (
    typeof window !==
    "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "dentaya-notification-preferences-change",
        {
          detail:
            preferences,
        }
      )
    );
  }
}
