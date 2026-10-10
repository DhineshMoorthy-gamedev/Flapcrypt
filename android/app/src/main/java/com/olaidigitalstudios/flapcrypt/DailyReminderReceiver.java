package com.olaidigitalstudios.flapcrypt;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Calendar;

public class DailyReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "DailyReminderReceiver";
    public static final String CHANNEL_ID = "flapcrypt_daily_reminders";
    public static final int NOTIFICATION_ID = 1001;
    public static final int ALARM_REQUEST_CODE = 2002;
    public static final String PREFS_NAME = "flapcrypt_notification_prefs";
    public static final String KEY_REMINDERS_ENABLED = "reminders_enabled";
    public static final String KEY_REMINDER_HOUR = "reminder_hour";
    public static final String KEY_REMINDER_MINUTE = "reminder_minute";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isEnabled = prefs.getBoolean(KEY_REMINDERS_ENABLED, false);

        String action = intent != null ? intent.getAction() : null;
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.d(TAG, "Device rebooted or package replaced. Checking if reminder re-arm is required. Enabled: " + isEnabled);
            if (isEnabled) {
                int hour = prefs.getInt(KEY_REMINDER_HOUR, 9);
                int minute = prefs.getInt(KEY_REMINDER_MINUTE, 0);
                scheduleDailyAlarm(context, hour, minute);
            }
            return;
        }

        // Alarm fired
        Log.d(TAG, "Daily reminder alarm triggered. Enabled: " + isEnabled);
        if (isEnabled) {
            showDailyNotification(context);
            // Re-arm for tomorrow
            int hour = prefs.getInt(KEY_REMINDER_HOUR, 9);
            int minute = prefs.getInt(KEY_REMINDER_MINUTE, 0);
            scheduleDailyAlarm(context, hour, minute);
        }
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
                if (existing == null) {
                    NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Daily Challenge Reminders",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Reminders for your daily mechanical cryptogram puzzle dispatch");
                    channel.enableVibration(true);
                    channel.setShowBadge(true);
                    manager.createNotificationChannel(channel);
                }
            }
        }
    }

    public static void showDailyNotification(Context context) {
        createNotificationChannel(context);

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("from_notification", "daily_reminder");

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_flapcrypt)
            .setColor(0xFF10B981)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher))
            .setContentTitle("FLAPCRYPT")
            .setContentText("Today's puzzle is waiting for you! Can you crack today's code?")
            .setStyle(new NotificationCompat.BigTextStyle().bigText("Today's mechanical cryptogram puzzle is ready! Keep your solving streak alive and flip your way to victory."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing when attempting to display reminder", e);
        } catch (Exception e) {
            Log.e(TAG, "Failed to display daily notification", e);
        }
    }

    public static void scheduleDailyAlarm(Context context, int hour, int minute) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, DailyReminderReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        // If time is in the past for today, schedule for tomorrow
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
            }
            Log.d(TAG, "Daily reminder scheduled successfully for: " + calendar.getTime().toString());
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule daily reminder alarm", e);
        }
    }

    public static void cancelDailyAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, DailyReminderReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        try {
            alarmManager.cancel(pendingIntent);
            Log.d(TAG, "Daily reminder alarm cancelled.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel daily reminder alarm", e);
        }
    }
}
