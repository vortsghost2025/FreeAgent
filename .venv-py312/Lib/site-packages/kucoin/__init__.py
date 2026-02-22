"""An unofficial Python wrapper for the Kucoin exchange API with Websocket support

.. moduleauthor:: Sam McHardy

"""

__version__ = "2.2.0"

from kucoin.client import Client  # noqa
from kucoin.async_client import AsyncClient  # noqa

from kucoin.exceptions import (
    KucoinAPIException,  # noqa
    KucoinRequestException,  # noqa
    MarketOrderException,  # noqa
    LimitOrderException,  # noqa
)
