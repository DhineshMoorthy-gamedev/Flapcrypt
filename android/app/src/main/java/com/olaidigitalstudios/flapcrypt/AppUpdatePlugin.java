package com.olaidigitalstudios.flapcrypt;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final String TAG = "FlapcryptAppUpdate";
    private static final int UPDATE_REQUEST_CODE = 9002;

    private AppUpdateManager appUpdateManager;
    private AppUpdateInfo cachedAppUpdateInfo;

    @Override
    public void load() {
        super.load();
        Activity activity = getActivity();
        if (activity != null) {
            appUpdateManager = AppUpdateManagerFactory.create(activity);
        }
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(activity);
        }

        try {
            Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();
            appUpdateInfoTask.addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    cachedAppUpdateInfo = task.getResult();
                    int updateAvailability = cachedAppUpdateInfo.updateAvailability();
                    boolean isAvailable = updateAvailability == UpdateAvailability.UPDATE_AVAILABLE
                        || updateAvailability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                    boolean inProgress = updateAvailability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;

                    boolean isImmediateAllowed = cachedAppUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE);
                    boolean isFlexibleAllowed = cachedAppUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE);
                    int availableVersionCode = cachedAppUpdateInfo.availableVersionCode();
                    int installStatus = cachedAppUpdateInfo.installStatus();
                    int stalenessDays = cachedAppUpdateInfo.clientVersionStalenessDays() != null 
                        ? cachedAppUpdateInfo.clientVersionStalenessDays() : 0;

                    JSObject ret = new JSObject();
                    ret.put("available", isAvailable);
                    ret.put("inProgress", inProgress);
                    ret.put("isImmediateAllowed", isImmediateAllowed);
                    ret.put("isFlexibleAllowed", isFlexibleAllowed);
                    ret.put("availableVersionCode", availableVersionCode);
                    ret.put("installStatus", installStatus);
                    ret.put("stalenessDays", stalenessDays);
                    ret.put("isDownloaded", installStatus == InstallStatus.DOWNLOADED);
                    call.resolve(ret);
                } else {
                    Exception ex = task.getException();
                    Log.w(TAG, "Failed to get app update info", ex);
                    JSObject ret = new JSObject();
                    ret.put("available", false);
                    ret.put("error", ex != null ? ex.getMessage() : "Update check failed");
                    call.resolve(ret);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error in checkForUpdate", e);
            JSObject ret = new JSObject();
            ret.put("available", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void startUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        String typeStr = call.getString("type", "immediate");
        int updateType = "flexible".equalsIgnoreCase(typeStr) ? AppUpdateType.FLEXIBLE : AppUpdateType.IMMEDIATE;

        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(activity);
        }

        try {
            appUpdateManager.getAppUpdateInfo().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    AppUpdateInfo info = task.getResult();
                    int chosenType = updateType;
                    if (chosenType == AppUpdateType.FLEXIBLE && !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                        chosenType = AppUpdateType.IMMEDIATE;
                    }

                    if (info.isUpdateTypeAllowed(chosenType)) {
                        try {
                            AppUpdateOptions options = AppUpdateOptions.newBuilder(chosenType).build();
                            appUpdateManager.startUpdateFlowForResult(info, activity, options, UPDATE_REQUEST_CODE);
                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("startedFlow", true);
                            call.resolve(ret);
                            return;
                        } catch (Exception ex) {
                            Log.e(TAG, "startUpdateFlowForResult failed, falling back to Play Store", ex);
                        }
                    }
                }
                
                // Fallback: Launch Google Play Store directly
                openPlayStore(activity);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fallback", true);
                call.resolve(ret);
            });
        } catch (Exception e) {
            Log.e(TAG, "Error starting update, falling back to store", e);
            openPlayStore(activity);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fallback", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void completeUpdate(PluginCall call) {
        if (appUpdateManager != null) {
            try {
                appUpdateManager.completeUpdate();
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.e(TAG, "Failed to complete update", e);
                call.reject("Failed to complete update: " + e.getMessage());
                return;
            }
        }
        call.reject("AppUpdateManager is null");
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }
        openPlayStore(activity);
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void openPlayStore(Activity activity) {
        try {
            String packageName = activity.getPackageName();
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        } catch (Exception e) {
            try {
                String packageName = activity.getPackageName();
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + packageName));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(webIntent);
            } catch (Exception ignored) {}
        }
    }
}
