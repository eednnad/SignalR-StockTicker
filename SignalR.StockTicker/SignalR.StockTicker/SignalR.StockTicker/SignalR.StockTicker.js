﻿/// <reference path="../scripts/jquery-1.6.4.js" />
/// <reference path="../scripts/jquery.signalr.js" />
if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
        return this.replace(/{([^{}]*)}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };
}

jQuery.fn.flash = function (color, duration) {
    var current = this.css('backgroundColor');
    this.animate({ backgroundColor: 'rgb(' + color + ')' }, duration / 2)
        .animate({ backgroundColor: current }, duration / 2);
}

$(function () {

    var ticker = $.connection.stockTicker,
        up = '▲',
        down = '▼',
        $stockTable = $('#stockTable'),
        $stockTableBody = $stockTable.find('tbody'),
        rowTemplate = '<tr data-symbol="{Symbol}"><td>{Symbol}</td><td>{Price}</td><td>{DayOpen}</td><td>{DayHigh}</td><td>{DayLow}</td><td><span class="dir {DirectionClass}">{Direction}</span> {Change}</td><td>{PercentChange}</td></tr>',
        $stockTicker = $('#stockTicker'),
        $stockTickerUl = $stockTicker.find('ul'),
        liTemplate = '<li data-symbol="{Symbol}"><span class="symbol">{Symbol}</span> <span class="price">{Price}</span> <span class="change"><span class="dir {DirectionClass}">{Direction}</span> {Change} ({PercentChange})</span></li>';

    function formatStock(stock) {
        return $.extend(stock, {
            Price: stock.Price.toFixed(2),
            PercentChange: (stock.PercentChange * 100).toFixed(2) + '%',
            Direction: stock.Change === 0 ? '-' : stock.Change >= 0 ? up : down,
            DirectionClass: stock.Change === 0 ? 'even' : stock.Price >= 0 ? 'up' : 'down'
        });
    }

    ticker.updateStockPrice = function (stock) {
        var displayStock = formatStock(stock),
            $row = $(rowTemplate.supplant(displayStock)),
            $li = $(liTemplate.supplant(displayStock));
        $stockTableBody.find('tr[data-symbol=' + stock.Symbol + ']')
            .replaceWith($row);
        $stockTickerUl.find('li[data-symbol=' + stock.Symbol + ']')
            .replaceWith($li);
        // TODO: Make it flash red/green depending on whether it went down/up
        $row.flash('255,255,0', 1000);
        $li.flash('255,255,0', 1000);
    };

    ticker.marketOpened = function () {
        $("#open").prop("disabled", true);
        $("#close").prop("disabled", false);
        $("#reset").prop("disabled", true);
        scrollTicker();
    };

    ticker.marketClosed = function () {
        $("#open").prop("disabled", false);
        $("#close").prop("disabled", true);
        $("#reset").prop("disabled", false);
        stopTicker();
    };

    ticker.marketReset = function () {
        init();
    };

    function scrollTicker() {
        var w = $stockTickerUl.width();
        $stockTickerUl.css({ marginLeft: w });
        $stockTickerUl.animate({ marginLeft: -w }, 15000, 'linear', scrollTicker);
    }

    function stopTicker() {
        $stockTickerUl.stop();
    }

    function init() {
        return ticker.getAllStocks()
            .done(function (stocks) {
                $stockTableBody.empty();
                $.each(stocks, function () {
                    var stock = formatStock(this);
                    $stockTableBody.append(rowTemplate.supplant(stock));
                    $stockTickerUl.append(liTemplate.supplant(stock));
                });
            });
    }

    $.connection.hub.start(function () {
        init().done(function () {
            ticker.getMarketState()
                .done(function (state) {
                    if (state === 'Open') {
                        ticker.marketOpened();
                    } else {
                        ticker.marketClosed();
                    }
                });
        });
    });

    $("#open").click(function () {
        ticker.openMarket()
            .done(function() {
                //ticker.marketOpened();
            });
    });

    $("#close").click(function () {
        ticker.closeMarket()
            .done(function () {
                //ticker.marketClosed();
            });
    });

    $("#reset").click(function () {
        ticker.reset();
    });
});