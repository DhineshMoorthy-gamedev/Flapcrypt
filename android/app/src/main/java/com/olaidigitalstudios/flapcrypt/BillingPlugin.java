package com.olaidigitalstudios.flapcrypt;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.android.billingclient.api.*;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String TAG = "FlapcryptBilling";

    private BillingClient billingClient;
    private final Map<String, ProductDetails> productDetailsMap = new HashMap<>();
    private PluginCall activePurchaseCall = null;
    private boolean isConnecting = false;

    @Override
    public void load() {
        super.load();
        initBillingClient();
    }

    private synchronized void initBillingClient() {
        if (billingClient != null && billingClient.isReady()) {
            return;
        }

        Activity activity = getActivity();
        if (activity == null) return;

        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build();

        billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases(pendingPurchasesParams)
            .build();

        startBillingConnection(null);
    }

    private void startBillingConnection(@Nullable Runnable onReady) {
        if (billingClient == null) return;
        if (billingClient.isReady()) {
            if (onReady != null) onReady.run();
            return;
        }

        if (isConnecting) return;
        isConnecting = true;

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                isConnecting = false;
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.i(TAG, "Google Play Billing Client connected successfully.");
                    cacheProducts(null);
                    if (onReady != null) {
                        new Handler(Looper.getMainLooper()).post(onReady);
                    }
                } else {
                    Log.w(TAG, "Billing setup failed with code: " + billingResult.getResponseCode() + " " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isConnecting = false;
                Log.w(TAG, "Billing service disconnected. Will reconnect on next request.");
            }
        });
    }

    private void cacheProducts(@Nullable PluginCall call) {
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId("remove_ads")
            .setProductType(BillingClient.ProductType.INAPP)
            .build());
        productList.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId("hints_25")
            .setProductType(BillingClient.ProductType.INAPP)
            .build());
        productList.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId("hints_50")
            .setProductType(BillingClient.ProductType.INAPP)
            .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) {
                productDetailsMap.clear();
                JSArray items = new JSArray();
                for (ProductDetails details : list) {
                    productDetailsMap.put(details.getProductId(), details);

                    JSObject item = new JSObject();
                    item.put("productId", details.getProductId());
                    item.put("title", details.getTitle());
                    item.put("description", details.getDescription());

                    ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                    if (offer != null) {
                        item.put("formattedPrice", offer.getFormattedPrice());
                        item.put("priceAmountMicros", offer.getPriceAmountMicros());
                        item.put("priceCurrencyCode", offer.getPriceCurrencyCode());
                    }
                    items.put(item);
                }

                if (call != null) {
                    JSObject ret = new JSObject();
                    ret.put("products", items);
                    call.resolve(ret);
                }
            } else {
                Log.w(TAG, "Failed to query products: " + billingResult.getDebugMessage());
                if (call != null) {
                    call.reject("Failed to query product details: " + billingResult.getDebugMessage());
                }
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        ensureConnected(() -> cacheProducts(call), call);
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("Missing productId argument");
            return;
        }

        ensureConnected(() -> {
            ProductDetails details = productDetailsMap.get(productId);
            if (details == null) {
                // Try querying once more in case cache is cold
                List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
                productList.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build());

                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

                billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
                    List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null && !list.isEmpty()) {
                        ProductDetails freshDetails = list.get(0);
                        productDetailsMap.put(productId, freshDetails);
                        launchFlow(freshDetails, call);
                    } else {
                        call.reject("Product not found on Google Play: " + productId);
                    }
                });
            } else {
                launchFlow(details, call);
            }
        }, call);
    }

    private void launchFlow(ProductDetails details, PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        productDetailsParamsList.add(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .build()
        );

        BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build();

        this.activePurchaseCall = call;
        BillingResult result = billingClient.launchBillingFlow(activity, billingFlowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            activePurchaseCall = null;
            call.reject("Launch billing flow failed: " + result.getDebugMessage());
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();
        PluginCall call = this.activePurchaseCall;
        this.activePurchaseCall = null;

        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                handlePurchase(purchase, call);
            }
        } else if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("cancelled", true);
                ret.put("success", false);
                call.resolve(ret);
            }
        } else {
            if (call != null) {
                call.reject("Purchase failed with response code: " + responseCode + " - " + billingResult.getDebugMessage());
            }
        }
    }

    private void handlePurchase(Purchase purchase, @Nullable PluginCall call) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("pending", true);
                ret.put("success", false);
                call.resolve(ret);
            }
            return;
        }

        List<String> products = purchase.getProducts();
        String productId = products.isEmpty() ? "" : products.get(0);

        // If it is a consumable hint pack, consume it so it can be bought again
        if ("hints_25".equals(productId) || "hints_50".equals(productId)) {
            ConsumeParams consumeParams = ConsumeParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

            billingClient.consumeAsync(consumeParams, (billingResult, purchaseToken) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("productId", productId);
                    ret.put("purchaseToken", purchaseToken);
                    ret.put("consumed", true);
                    if (call != null) call.resolve(ret);
                } else {
                    if (call != null) call.reject("Failed to consume purchase: " + billingResult.getDebugMessage());
                }
            });
        } else {
            // Non-consumable (e.g. remove_ads), acknowledge it permanently
            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();

                billingClient.acknowledgePurchase(ackParams, billingResult -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("productId", productId);
                        ret.put("acknowledged", true);
                        if (call != null) call.resolve(ret);
                    } else {
                        if (call != null) call.reject("Failed to acknowledge purchase: " + billingResult.getDebugMessage());
                    }
                });
            } else {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("productId", productId);
                ret.put("acknowledged", true);
                if (call != null) call.resolve(ret);
            }
        }
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSArray ownedProducts = new JSArray();
                    boolean hasRemoveAds = false;

                    for (Purchase purchase : purchases) {
                        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            for (String pId : purchase.getProducts()) {
                                ownedProducts.put(pId);
                                if ("remove_ads".equals(pId)) {
                                    hasRemoveAds = true;
                                }
                            }
                            // Acknowledge if not acknowledged yet
                            if (!purchase.isAcknowledged()) {
                                AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                                    .setPurchaseToken(purchase.getPurchaseToken())
                                    .build();
                                billingClient.acknowledgePurchase(ackParams, result -> {});
                            }
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("ownedProducts", ownedProducts);
                    ret.put("removeAds", hasRemoveAds);
                    ret.put("count", purchases.size());
                    call.resolve(ret);
                } else {
                    call.reject("Restore purchases query failed: " + billingResult.getDebugMessage());
                }
            });
        }, call);
    }

    private void ensureConnected(Runnable task, @Nullable PluginCall call) {
        if (billingClient == null) {
            initBillingClient();
        }

        if (billingClient.isReady()) {
            task.run();
        } else {
            startBillingConnection(task);
        }
    }
}
