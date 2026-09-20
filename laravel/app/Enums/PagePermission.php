<?php

namespace App\Enums;

enum PagePermission: string
{
    case Products = 'products';
    case ProductsManage = 'products.manage';
    case Categories = 'categories';
    case CategoriesManage = 'categories.manage';
    case Stores = 'stores';
    case StoresManage = 'stores.manage';
    case Collectors = 'collectors';
    case CollectorsManage = 'collectors.manage';
    case Stock = 'stock';
    case Purchases = 'purchases';
    case Suppliers = 'suppliers';
    case Releases = 'releases';
    case Invoices = 'invoices';
    case InvoicesSell = 'invoices.sell';
    case Reports = 'reports';
    case ReportsReview = 'reports.review';
    case Expenses = 'expenses';
    case Collections = 'collections';
    case Users = 'users';

    public function label(): string
    {
        return match ($this) {
            self::Products => __('ui.perm_products'),
            self::ProductsManage => __('ui.perm_products_manage'),
            self::Categories => __('ui.perm_categories'),
            self::CategoriesManage => __('ui.perm_categories_manage'),
            self::Stores => __('ui.perm_stores'),
            self::StoresManage => __('ui.perm_stores_manage'),
            self::Collectors => __('ui.perm_collectors'),
            self::CollectorsManage => __('ui.perm_collectors_manage'),
            self::Stock => __('ui.perm_stock'),
            self::Purchases => __('ui.perm_purchases'),
            self::Suppliers => __('ui.perm_suppliers'),
            self::Releases => __('ui.perm_releases'),
            self::Invoices => __('ui.perm_invoices'),
            self::InvoicesSell => __('ui.perm_invoices_sell'),
            self::Reports => __('ui.perm_reports'),
            self::ReportsReview => __('ui.perm_reports_review'),
            self::Expenses => __('ui.perm_expenses'),
            self::Collections => __('ui.perm_collections'),
            self::Users => __('ui.perm_users'),
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::Products, self::ProductsManage => 'products',
            self::Categories, self::CategoriesManage => 'categories',
            self::Stores, self::StoresManage => 'stores',
            self::Collectors, self::CollectorsManage => 'collectors',
            self::Stock, self::Purchases, self::Suppliers, self::Releases => 'warehouse',
            self::Invoices, self::InvoicesSell, self::Reports, self::ReportsReview, self::Expenses, self::Collections => 'sales',
            self::Users => 'admin',
        };
    }

    /**
     * @return list<self>
     */
    public static function defaultsFor(Role $role): array
    {
        return match ($role) {
            Role::Admin => self::cases(),
            Role::Accountant => [
                self::Products,
                self::ProductsManage,
                self::Categories,
                self::CategoriesManage,
                self::Stores,
                self::StoresManage,
                self::Collectors,
                self::Stock,
                self::Purchases,
                self::Suppliers,
                self::Releases,
                self::Invoices,
                self::Reports,
                self::ReportsReview,
                self::Collections,
            ],
            Role::Collector => [
                self::Products,
                self::Categories,
                self::Stores,
                self::Invoices,
                self::InvoicesSell,
                self::Reports,
                self::Expenses,
                self::Collections,
            ],
        };
    }

    /**
     * @return list<string>
     */
    public static function defaultValuesFor(Role $role): array
    {
        return array_map(
            fn (self $p) => $p->value,
            self::defaultsFor($role),
        );
    }
}
