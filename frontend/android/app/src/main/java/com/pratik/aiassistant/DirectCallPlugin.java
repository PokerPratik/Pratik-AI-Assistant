package com.pratik.aiassistant;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "DirectCall",
    permissions = {
        @Permission(
            alias = "call",
            strings = { Manifest.permission.CALL_PHONE }
        )
    }
)
public class DirectCallPlugin extends Plugin {

    @PluginMethod
    public void startCall(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.isEmpty()) {
            call.reject("Must provide a number");
            return;
        }

        if (getPermissionState("call") != PermissionState.GRANTED) {
            requestPermissionForAlias("call", call, "callPermissionCallback");
        } else {
            makeCall(call, number);
        }
    }

    private void makeCall(PluginCall call, String number) {
        String safeNumber = number.replaceAll("[^0-9+]", "");
        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + safeNumber));
        try {
            bridge.getActivity().startActivity(intent);
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Permission denied " + e.getMessage());
        } catch (Exception e) {
            call.reject("Could not call " + e.getMessage());
        }
    }

    @PermissionCallback
    private void callPermissionCallback(PluginCall call) {
        if (getPermissionState("call") == PermissionState.GRANTED) {
            startCall(call);
        } else {
            call.reject("Permission is required to make direct calls");
        }
    }
}
