<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CollectorController;
use App\Http\Controllers\DevicePendingController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NotificationFeedController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReleaseController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('home')
        : redirect()->route('login');
});

Route::post('/locale/next', [LocaleController::class, 'next'])->name('locale.next');
Route::post('/locale/{locale}', LocaleController::class)->name('locale.switch');

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->name('login.store');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/device/pending', [DevicePendingController::class, 'show'])->name('device.pending');
    Route::get('/device/pending/poll', [DevicePendingController::class, 'poll'])->name('device.pending.poll');
    Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');
});

Route::middleware(['auth', 'active', 'device'])->group(function () {
    Route::get('/home', HomeController::class)->name('home');

    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings/preferences', [SettingsController::class, 'updatePreferences'])->name('settings.preferences');
    Route::get('/settings/backup', [SettingsController::class, 'backup'])->name('settings.backup');
    Route::post('/settings/devices/{deviceLoginRequest}/approve', [SettingsController::class, 'approveDevice'])->name('settings.devices.approve');
    Route::post('/settings/devices/{deviceLoginRequest}/reject', [SettingsController::class, 'rejectDevice'])->name('settings.devices.reject');
    Route::delete('/settings/my-devices/{userDevice}', [SettingsController::class, 'revokeDevice'])->name('settings.devices.revoke');
    Route::post('/settings/notifications', [SettingsController::class, 'sendNotification'])->name('settings.notifications.send');
    Route::post('/settings/notifications/read', [SettingsController::class, 'markNotificationsRead'])->name('settings.notifications.read');
    Route::get('/api/notifications', NotificationFeedController::class)->name('notifications.feed');

    Route::middleware('perm:products')->group(function () {
        Route::get('products', [ProductController::class, 'index'])->name('products.index');
    });

    Route::middleware('perm:products.manage')->group(function () {
        Route::resource('products', ProductController::class)->except(['show', 'index']);
    });

    Route::middleware('perm:stores')->group(function () {
        Route::get('stores', [StoreController::class, 'index'])->name('stores.index');
    });

    Route::middleware('perm:stores.manage')->group(function () {
        Route::resource('stores', StoreController::class)->except(['show', 'index']);
    });

    Route::middleware('perm:stores')->group(function () {
        Route::get('stores/{store}', [StoreController::class, 'show'])
            ->whereNumber('store')
            ->name('stores.show');
    });

    Route::middleware('perm:categories')->group(function () {
        Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
    });

    Route::middleware('perm:categories.manage')->group(function () {
        Route::get('categories/create', [CategoryController::class, 'create'])->name('categories.create');
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::get('categories/{category}/edit', [CategoryController::class, 'edit'])->name('categories.edit');
        Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

        Route::get('categories/{category}/subcategories/create', [CategoryController::class, 'createSubcategory'])
            ->name('categories.subcategories.create');
        Route::post('categories/{category}/subcategories', [CategoryController::class, 'storeSubcategory'])
            ->name('categories.subcategories.store');
        Route::get('subcategories/{subcategory}/edit', [CategoryController::class, 'editSubcategory'])
            ->name('subcategories.edit');
        Route::put('subcategories/{subcategory}', [CategoryController::class, 'updateSubcategory'])
            ->name('subcategories.update');
        Route::delete('subcategories/{subcategory}', [CategoryController::class, 'destroySubcategory'])
            ->name('subcategories.destroy');
    });

    Route::middleware('perm:invoices.sell')->group(function () {
        Route::get('invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
        Route::post('invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    });

    Route::middleware('perm:invoices')->group(function () {
        Route::get('invoices', [InvoiceController::class, 'index'])->name('invoices.index');
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
        Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('invoices.cancel');
    });

    Route::middleware('perm:collectors')->group(function () {
        Route::get('collectors', function () {
            return redirect()->route('users.index', ['role' => 'collector']);
        })->name('collectors.index');
    });

    Route::middleware('perm:collectors.manage')->group(function () {
        Route::resource('collectors', CollectorController::class)->except(['show', 'index']);
    });

    Route::middleware('perm:suppliers')->group(function () {
        Route::resource('suppliers', SupplierController::class)->except(['show']);
    });

    Route::middleware('perm:stock')->group(function () {
        Route::get('stock', [StockController::class, 'index'])->name('stock.index');
    });

    Route::middleware('perm:purchases')->group(function () {
        Route::get('purchases', [PurchaseController::class, 'index'])->name('purchases.index');
        Route::get('purchases/create', [PurchaseController::class, 'create'])->name('purchases.create');
        Route::post('purchases', [PurchaseController::class, 'store'])->name('purchases.store');
        Route::get('purchases/{purchase}', [PurchaseController::class, 'show'])->name('purchases.show');
    });

    Route::middleware('perm:releases')->group(function () {
        Route::get('releases', [ReleaseController::class, 'index'])->name('releases.index');
        Route::post('releases/{invoice}/send', [ReleaseController::class, 'send'])->name('releases.send');
    });

    Route::middleware('perm:reports,reports.review')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    });

    Route::middleware('perm:expenses,reports.review')->group(function () {
        Route::get('expenses', [ExpenseController::class, 'index'])->name('expenses.index');
        Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');
    });

    Route::middleware('perm:expenses')->group(function () {
        Route::get('expenses/create', [ExpenseController::class, 'create'])->name('expenses.create');
        Route::post('expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    });

    Route::middleware('perm:collections')->group(function () {
        Route::get('collections/create', [CollectionController::class, 'create'])->name('collections.create');
        Route::post('collections', [CollectionController::class, 'store'])->name('collections.store');
    });

    Route::middleware('perm:reports.review')->group(function () {
        Route::post('collections/{collection}/confirm', [CollectionController::class, 'confirm'])->name('collections.confirm');
    });

    Route::middleware('perm:collections,reports.review')->group(function () {
        Route::get('collections', [CollectionController::class, 'index'])->name('collections.index');
        Route::get('collections/{collection}', [CollectionController::class, 'show'])->name('collections.show');
        Route::delete('collections/{collection}', [CollectionController::class, 'destroy'])->name('collections.destroy');
    });

    Route::middleware('perm:users,collectors')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
    });

    Route::middleware('perm:users')->group(function () {
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
    });
});
