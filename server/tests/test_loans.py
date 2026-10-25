import sys
from datetime import date
from unittest.mock import MagicMock

import pytest

sys.modules.setdefault("database", MagicMock())

from routers.features import emi_due_date, loan_progress  # noqa: E402

START = date(2026, 6, 11)


@pytest.mark.parametrize("today,paid,next_due", [
    (date(2026, 6, 11), 0, "2026-07-11"),   # the day the loan starts: nothing due yet
    (date(2026, 7, 10), 0, "2026-07-11"),
    (date(2026, 7, 11), 1, "2026-08-11"),   # first EMI on its due day
    (date(2026, 10, 25), 4, "2026-11-11"),  # Jul, Aug, Sep, Oct: four, not five
    (date(2026, 11, 5), 4, "2026-11-11"),   # November not due until the 11th
    (date(2027, 12, 1), 12, None),          # all paid, capped at the tenure
])
def test_emis_count_from_one_month_after_start(today, paid, next_due):
    assert loan_progress(START, 12, today) == {"months_paid": paid, "next_emi_date": next_due}


def test_month_end_start_dates_stay_in_their_month():
    assert emi_due_date(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert emi_due_date(date(2026, 1, 31), 2) == date(2026, 3, 31)
    assert emi_due_date(date(2026, 11, 30), 3) == date(2027, 2, 28)
