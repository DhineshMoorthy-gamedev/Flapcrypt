package com.olaidigitalstudios.flapcrypt;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "DailyNotification",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class NotificationPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        Activity activity = getActivity();
        if (activity != null) {
            DailyReminderReceiver.createNotificationChannel(activity);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Android 12 and below: Notifications enabled by default upon install
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        // Trigger native Android system permission prompt
        requestPermissionForAlias("notifications", call, "notificationsCallback");
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        boolean granted = getPermissionState("notifications") == PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        boolean granted = true;
        Activity activity = getActivity();
        if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleDailyReminder(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        int hour = call.getInt("hour", 9);
        int minute = call.getInt("minute", 0);

        SharedPreferences prefs = activity.getSharedPreferences(DailyReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(DailyReminderReceiver.KEY_REMINDERS_ENABLED, true)
            .putInt(DailyReminderReceiver.KEY_REMINDER_HOUR, hour)
            .putInt(DailyReminderReceiver.KEY_REMINDER_MINUTE, minute)
            .apply();

        DailyReminderReceiver.scheduleDailyAlarm(activity, hour, minute);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("hour", hour);
        ret.put("minute", minute);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelDailyReminder(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        SharedPreferences prefs = activity.getSharedPreferences(DailyReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(DailyReminderReceiver.KEY_REMINDERS_ENABLED, false)
            .apply();

        DailyReminderReceiver.cancelDailyAlarm(activity);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void sendTestNotification(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        DailyReminderReceiver.showDailyNotification(activity);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
