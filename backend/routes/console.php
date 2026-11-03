<?php

use App\Services\VnpayPendingOrderExpirer;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('vnpay:expire-pending-orders', function (VnpayPendingOrderExpirer $expirer) {
    $count = $expirer->expire();
    $this->info("Expired {$count} pending VNPay order(s).");
})->purpose('Release stock reserved by expired VNPay payments');

Schedule::command('vnpay:expire-pending-orders')->everyMinute()->withoutOverlapping();
