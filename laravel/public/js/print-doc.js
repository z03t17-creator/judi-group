(function () {
    function setPageStyle(mode) {
        var el = document.getElementById('judi-print-page');
        if (!el) {
            el = document.createElement('style');
            el.id = 'judi-print-page';
            document.head.appendChild(el);
        }
        if (mode === 'slip') {
            el.textContent = '@page{size:80mm auto;margin:3mm}';
        } else if (mode === 'voucher') {
            el.textContent = '@page{size:A5 landscape;margin:0}';
        } else {
            el.textContent = '@page{size:A4 portrait;margin:0}';
        }
    }

    function hidePrintGate() {
        var gate = document.querySelector('[data-print-gate]');
        if (gate) gate.hidden = true;
        try {
            sessionStorage.removeItem('judiPrintAfterSave');
        } catch (e) {}
    }

    window.judiPrint = function (mode, options) {
        options = options || {};
        var html = document.documentElement;
        var prevTitle = document.title;
        var titleEl = document.querySelector('.print-doc-head__title');
        var pageName = titleEl ? titleEl.textContent.trim() : '';
        if (pageName) {
            document.title = pageName + ' — JUDI';
        }

        html.classList.toggle('print-thermal', mode === 'slip');
        html.classList.toggle('print-voucher', mode === 'voucher');
        setPageStyle(mode === 'slip' ? 'slip' : (mode === 'voucher' ? 'voucher' : 'a4'));

        var cleaned = false;
        var cleanup = function () {
            if (cleaned) return;
            cleaned = true;
            html.classList.remove('print-thermal', 'print-voucher');
            setPageStyle('a4');
            document.title = prevTitle;
            window.removeEventListener('afterprint', cleanup);
            if (!options.keepGate) {
                hidePrintGate();
            }
            if (typeof options.onDone === 'function') {
                options.onDone();
            }
        };
        window.addEventListener('afterprint', cleanup);
        window.setTimeout(cleanup, 4000);

        try {
            window.focus();
            window.print();
        } catch (e) {}
    };

    window.judiPrintSequence = function (modes) {
        var list = Array.isArray(modes) ? modes.filter(Boolean) : [];
        if (!list.length) return;
        var i = 0;
        var next = function () {
            if (i >= list.length) {
                hidePrintGate();
                return;
            }
            var mode = list[i++];
            var last = i >= list.length;
            window.judiPrint(mode, {
                keepGate: !last,
                onDone: function () {
                    window.setTimeout(next, 350);
                },
            });
        };
        next();
    };

    document.addEventListener('click', function (event) {
        var skip = event.target.closest('[data-print-gate-skip]');
        if (skip) {
            event.preventDefault();
            hidePrintGate();
            return;
        }
        var seqBtn = event.target.closest('[data-print-sequence]');
        if (seqBtn) {
            event.preventDefault();
            var raw = seqBtn.getAttribute('data-print-sequence') || '';
            window.judiPrintSequence(
                raw.split(',').map(function (part) {
                    return part.trim();
                })
            );
            return;
        }
        var btn = event.target.closest('[data-print]');
        if (!btn) return;
        event.preventDefault();
        window.judiPrint(btn.getAttribute('data-print') || 'a4');
    });
})();
