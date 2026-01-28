# Future Ticketing API Documentation

- [API Documentation](https://external.futureticketing.ie/v1/)
- [API Howto](https://external.futureticketing.ie/v1/howto)
- [Styling Documentation](https://external.futureticketing.ie/v1/style)

- [FUTURE TICKETING](https://external.futureticketing.ie/#future-ticketing)
  - [Getting started](https://external.futureticketing.ie/#future-ticketing-getting-started)
  - [How to access](https://external.futureticketing.ie/#future-ticketing-how-to-access)
    - [General Public Calls](https://external.futureticketing.ie/#future-ticketing-how-to-access-general-public-calls)
    - [Private Calls Authentication](https://external.futureticketing.ie/#future-ticketing-how-to-access-private-calls-authentication)
    - [Errors](https://external.futureticketing.ie/#future-ticketing-how-to-access-errors)
- [Public Resources](https://external.futureticketing.ie/#public-resources)
  - [Login (POST)](https://external.futureticketing.ie/#public-resources-login-post)
  - [Account Access](https://external.futureticketing.ie/#public-resources-account-access)
    - [Register (POST)](https://external.futureticketing.ie/#public-resources-account-access-register-post)
    - [Forgotten Password (POST)](https://external.futureticketing.ie/#public-resources-account-access-forgotten-password-post)
    - [Reset Password (POST)](https://external.futureticketing.ie/#public-resources-account-access-reset-password-post)
    - [Login (POST)](https://external.futureticketing.ie/#public-resources-account-access-login-post)
  - [Event (GET)](https://external.futureticketing.ie/#public-resources-event-get)
- [Private Resources](https://external.futureticketing.ie/#private-resources)
  - [Event](https://external.futureticketing.ie/#private-resources-event)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-event-list-get)
    - [List (POST)](https://external.futureticketing.ie/#private-resources-event-list-post)
    - [Entry (GET)](https://external.futureticketing.ie/#private-resources-event-entry-get)
    - [Ticket Entry(GET)](https://external.futureticketing.ie/#private-resources-event-ticket-entryget)
    - [Add (POST)](https://external.futureticketing.ie/#private-resources-event-add-post)
    - [Update (PUT)](https://external.futureticketing.ie/#private-resources-event-update-put)
    - [Update By Internal ID (PUT)](https://external.futureticketing.ie/#private-resources-event-update-by-internal-id-put)
    - [Archive (DELETE)](https://external.futureticketing.ie/#private-resources-event-archive-delete)
    - [Disable (PUT)](https://external.futureticketing.ie/#private-resources-event-disable-put)
    - [Enable (PUT)](https://external.futureticketing.ie/#private-resources-event-enable-put)
    - [Event Group (GET)](https://external.futureticketing.ie/#private-resources-event-event-group-get)
    - [Event Category Type (GET)](https://external.futureticketing.ie/#private-resources-event-event-category-type-get)
    - [Event Category (GET)](https://external.futureticketing.ie/#private-resources-event-event-category-get)
    - [Event Registration (POST)](https://external.futureticketing.ie/#private-resources-event-event-registration-post)
  - [Product](https://external.futureticketing.ie/#private-resources-product)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-product-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-product-get-get)
    - [Add (POST)](https://external.futureticketing.ie/#private-resources-product-add-post)
    - [Update (PUT)](https://external.futureticketing.ie/#private-resources-product-update-put)
    - [Update By Internal ID (PUT)](https://external.futureticketing.ie/#private-resources-product-update-by-internal-id-put)
    - [Archive (DELETE)](https://external.futureticketing.ie/#private-resources-product-archive-delete)
    - [Disable (PUT)](https://external.futureticketing.ie/#private-resources-product-disable-put)
    - [Enable (PUT)](https://external.futureticketing.ie/#private-resources-product-enable-put)
  - [Voucher](https://external.futureticketing.ie/#private-resources-voucher)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-voucher-list-get)
  - [Country](https://external.futureticketing.ie/#private-resources-country)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-country-list-get)
  - [County](https://external.futureticketing.ie/#private-resources-county)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-county-list-get)
  - [User](https://external.futureticketing.ie/#private-resources-user)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-user-list-get)
  - [Delivery](https://external.futureticketing.ie/#private-resources-delivery)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-delivery-list-get)
  - [Charge](https://external.futureticketing.ie/#private-resources-charge)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-charge-list-get)
  - [Allowed Site](https://external.futureticketing.ie/#private-resources-allowed-site)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-allowed-site-list-get)
  - [Donation](https://external.futureticketing.ie/#private-resources-donation)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-donation-list-get)
  - [Scanner Location](https://external.futureticketing.ie/#private-resources-scanner-location)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-scanner-location-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-scanner-location-get-get)
  - [Extra Field](https://external.futureticketing.ie/#private-resources-extra-field)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-extra-field-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-extra-field-get-get)
  - [Order Sales Channel](https://external.futureticketing.ie/#private-resources-order-sales-channel)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-order-sales-channel-list-get)
  - [Orders](https://external.futureticketing.ie/#private-resources-orders)
  - [Order Renewals](https://external.futureticketing.ie/#private-resources-order-renewals)
    - [Previous (GET)](https://external.futureticketing.ie/#private-resources-order-renewals-previous-get)
    - [Previous By Event (GET)](https://external.futureticketing.ie/#private-resources-order-renewals-previous-by-event-get)
    - [Renew (GET)](https://external.futureticketing.ie/#private-resources-order-renewals-renew-get)
    - [Renew by Event (GET)](https://external.futureticketing.ie/#private-resources-order-renewals-renew-by-event-get)
  - [Order Creating](https://external.futureticketing.ie/#private-resources-order-creating)
    - [Add (POST)](https://external.futureticketing.ie/#private-resources-order-creating-add-post)
    - [Update (POST)](https://external.futureticketing.ie/#private-resources-order-creating-update-post)
    - [Cart Add (POST)](https://external.futureticketing.ie/#private-resources-order-creating-cart-add-post)
    - [Cart Edit (PATCH)](https://external.futureticketing.ie/#private-resources-order-creating-cart-edit-patch)
    - [Cart Delete (DELETE)](https://external.futureticketing.ie/#private-resources-order-creating-cart-delete-delete)
    - [Update Payment Status (POST)](https://external.futureticketing.ie/#private-resources-order-creating-update-payment-status-post)
    - [Payment Request Check (POST)](https://external.futureticketing.ie/#private-resources-order-creating-payment-request-check-post)
    - [Check Order Payment Status (POST)](https://external.futureticketing.ie/#private-resources-order-creating-check-order-payment-status-post)
    - [Add Order Comment (POST)](https://external.futureticketing.ie/#private-resources-order-creating-add-order-comment-post)
    - [Get Extra Fields (Get)](https://external.futureticketing.ie/#private-resources-order-creating-get-extra-fields-get)
    - [Add/Update Extra Field (PUT)](https://external.futureticketing.ie/#private-resources-order-creating-addupdate-extra-field-put)
    - [Add Voucher (POST)](https://external.futureticketing.ie/#private-resources-order-creating-add-voucher-post)
    - [Remove Voucher (DELETE)](https://external.futureticketing.ie/#private-resources-order-creating-remove-voucher-delete)
    - [Add Voucher Card (POST)](https://external.futureticketing.ie/#private-resources-order-creating-add-voucher-card-post)
    - [Remove Voucher Card (DELETE)](https://external.futureticketing.ie/#private-resources-order-creating-remove-voucher-card-delete)
    - [Cancel Ticket (PUT)](https://external.futureticketing.ie/#private-resources-order-creating-cancel-ticket-put)
  - [Order Search](https://external.futureticketing.ie/#private-resources-order-search)
    - [Search](https://external.futureticketing.ie/#private-resources-order-search-search)
    - [Search (POST)](https://external.futureticketing.ie/#private-resources-order-search-search-post)
    - [Search/ID (GET)](https://external.futureticketing.ie/#private-resources-order-search-searchid-get)
    - [Search/Email (GET)](https://external.futureticketing.ie/#private-resources-order-search-searchemail-get)
    - [Search/Event (GET)](https://external.futureticketing.ie/#private-resources-order-search-searchevent-get)
    - [Search/Product (GET)](https://external.futureticketing.ie/#private-resources-order-search-searchproduct-get)
    - [Search/Date (GET)](https://external.futureticketing.ie/#private-resources-order-search-searchdate-get)
    - [Search/Summary (POST)](https://external.futureticketing.ie/#private-resources-order-search-searchsummary-post)
  - [Customer Account](https://external.futureticketing.ie/#private-resources-customer-account)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-customer-account-list-get)
    - [List (POST)](https://external.futureticketing.ie/#private-resources-customer-account-list-post)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-customer-account-get-get)
    - [Add (POST)](https://external.futureticketing.ie/#private-resources-customer-account-add-post)
    - [Update Account (PUT)](https://external.futureticketing.ie/#private-resources-customer-account-update-account-put)
    - [Add Address (POST)](https://external.futureticketing.ie/#private-resources-customer-account-add-address-post)
    - [List Address (GET)](https://external.futureticketing.ie/#private-resources-customer-account-list-address-get)
    - [Get Address (GET)](https://external.futureticketing.ie/#private-resources-customer-account-get-address-get)
    - [Update Address (PUT)](https://external.futureticketing.ie/#private-resources-customer-account-update-address-put)
    - [Update Category (POST)](https://external.futureticketing.ie/#private-resources-customer-account-update-category-post)
    - [Change Password (POST)](https://external.futureticketing.ie/#private-resources-customer-account-change-password-post)
    - [Active Tickets (POST)](https://external.futureticketing.ie/#private-resources-customer-account-active-tickets-post)
  - [Customer Company](https://external.futureticketing.ie/#private-resources-customer-company)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-customer-company-list-get)
    - [Add Company (POST)](https://external.futureticketing.ie/#private-resources-customer-company-add-company-post)
  - [Rewards4Racing](https://external.futureticketing.ie/#private-resources-rewards4racing)
    - [Get account details by email (GET)](https://external.futureticketing.ie/#private-resources-rewards4racing-get-account-details-by-email-get)
    - [Get point balance by account ID (GET)](https://external.futureticketing.ie/#private-resources-rewards4racing-get-point-balance-by-account-id-get)
  - [FT Rewards](https://external.futureticketing.ie/#private-resources-ft-rewards)
    - [Rewards Account Transactions (POST)](https://external.futureticketing.ie/#private-resources-ft-rewards-rewards-account-transactions-post)
  - [Ryft Payments](https://external.futureticketing.ie/#private-resources-ryft-payments)
    - [Google Pay with Ryft](https://external.futureticketing.ie/#private-resources-ryft-payments-google-pay-with-ryft)
    - [Apple Pay with Ryft](https://external.futureticketing.ie/#private-resources-ryft-payments-apple-pay-with-ryft)
    - [Sample Example of full javascript/html implementation](https://external.futureticketing.ie/#private-resources-ryft-payments-sample-example-of-full-javascripthtml-implementation)
    - [Process The Ryft Payment](https://external.futureticketing.ie/#private-resources-ryft-payments-process-the-ryft-payment)
    - [Finalize The Order](https://external.futureticketing.ie/#private-resources-ryft-payments-finalize-the-order)
    - [Updating the Payment session.](https://external.futureticketing.ie/#private-resources-ryft-payments-updating-the-payment-session)
    - [Update the form](https://external.futureticketing.ie/#private-resources-ryft-payments-update-the-form)
  - [Venue](https://external.futureticketing.ie/#private-resources-venue)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-venue-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-venue-get-get)
  - [Product Type](https://external.futureticketing.ie/#private-resources-product-type)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-product-type-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-product-type-get-get)
  - [Product Category](https://external.futureticketing.ie/#private-resources-product-category)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-product-category-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-product-category-get-get)
  - [Product Area](https://external.futureticketing.ie/#private-resources-product-area)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-product-area-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-product-area-get-get)
  - [Event Category](https://external.futureticketing.ie/#private-resources-event-category)
    - [List (GET)](https://external.futureticketing.ie/#private-resources-event-category-list-get)
    - [GET (GET)](https://external.futureticketing.ie/#private-resources-event-category-get-get)
  - [Entry](https://external.futureticketing.ie/#private-resources-entry)
    - [Scan (GET)](https://external.futureticketing.ie/#private-resources-entry-scan-get)
    - [Passout (GET)](https://external.futureticketing.ie/#private-resources-entry-passout-get)
    - [External Barcode Detail (GET)](https://external.futureticketing.ie/#private-resources-entry-external-barcode-detail-get)
    - [Validate Email in Event (POST)](https://external.futureticketing.ie/#private-resources-entry-validate-email-in-event-post)
    - [Add External Barcode (POST)](https://external.futureticketing.ie/#private-resources-entry-add-external-barcode-post)
  - [Ticket Protection](https://external.futureticketing.ie/#private-resources-ticket-protection)
    - [GET Quote (GET)](https://external.futureticketing.ie/#private-resources-ticket-protection-get-quote-get)
    - [Booking (GET)](https://external.futureticketing.ie/#private-resources-ticket-protection-booking-get)
    - [Booking Create (POST)](https://external.futureticketing.ie/#private-resources-ticket-protection-booking-create-post)
    - [Create Quote (POST)](https://external.futureticketing.ie/#private-resources-ticket-protection-create-quote-post)
    - [Apply Quote (POST)](https://external.futureticketing.ie/#private-resources-ticket-protection-apply-quote-post)
    - [Remove Quote (POST)](https://external.futureticketing.ie/#private-resources-ticket-protection-remove-quote-post)
  - [Artist](https://external.futureticketing.ie/#private-resources-artist)
    - [List (POST)](https://external.futureticketing.ie/#private-resources-artist-list-post)
- [Status Tables](https://external.futureticketing.ie/#status-tables)
  - [Order Status](https://external.futureticketing.ie/#status-tables-order-status)
  - [Payment Provider](https://external.futureticketing.ie/#status-tables-payment-provider)
  - [Extra Field Type](https://external.futureticketing.ie/#status-tables-extra-field-type)
  - [Tax Options](https://external.futureticketing.ie/#status-tables-tax-options)
  - [Product Types Reference](https://external.futureticketing.ie/#status-tables-product-types-reference)
- [Allocation Checks](https://external.futureticketing.ie/#allocation-checks)
  - [Account Category Max](https://external.futureticketing.ie/#allocation-checks-account-category-max)
- [Seating Plan](https://external.futureticketing.ie/#seating-plan)
  - [Best Available](https://external.futureticketing.ie/#seating-plan-best-available)
- [FT Seats](https://external.futureticketing.ie/#ft-seats)
  - [Loading the FT Seating Chart](https://external.futureticketing.ie/#ft-seats-loading-the-ft-seating-chart)
  - [Using the javascript sdk](https://external.futureticketing.ie/#ft-seats-using-the-javascript-sdk)
  - [Adding Seats to the order](https://external.futureticketing.ie/#ft-seats-adding-seats-to-the-order)
  - [Completing the booking](https://external.futureticketing.ie/#ft-seats-completing-the-booking)
  - [Adding Additional Seats](https://external.futureticketing.ie/#ft-seats-adding-additional-seats)
  - [Book seats using other payment types](https://external.futureticketing.ie/#ft-seats-book-seats-using-other-payment-types)
- [Dashboard Connect](https://external.futureticketing.ie/#dashboard-connect)
  - [Retrieve The “ticket\_client\_uuid\_sender” value](https://external.futureticketing.ie/#dashboard-connect-retrieve-the-ticket_client_uuid_sender-value)
  - [Add Dashboard Connect Order](https://external.futureticketing.ie/#dashboard-connect-add-dashboard-connect-order)
  - [Retrieve Stripe Details for connected client](https://external.futureticketing.ie/#dashboard-connect-retrieve-stripe-details-for-connected-client)
  - [Add to cart using /private/order/cart/{order-uuid} POST](https://external.futureticketing.ie/#dashboard-connect-add-to-cart-using-privateordercartorder-uuid-post)
  - [Charges and Delivery Types](https://external.futureticketing.ie/#dashboard-connect-charges-and-delivery-types)
  - [Order Searching](https://external.futureticketing.ie/#dashboard-connect-order-searching)
  - [Payload for all other Dashboard Connect eneabled endpoints.](https://external.futureticketing.ie/#dashboard-connect-payload-for-all-other-dashboard-connect-eneabled-endpoints)
  - [Seating Plan with Dashboard Connect.](https://external.futureticketing.ie/#dashboard-connect-seating-plan-with-dashboard-connect)
  - [Multiple Event Restriction](https://external.futureticketing.ie/#dashboard-connect-multiple-event-restriction)

# FUTURE TICKETING

Future Ticketing is a cloud-based, enterprise, Ticketing solution.

This documentation outlines the available endpoints that are available
to access this service externally.

_Current version: \[v1.5\]_

## Getting started

You will need to have both a Future Ticketing account and an API/Key combination. If you don’t have an account
or an API/Key combination please [contact us](https://www.futureticketing.com/contact-us/). Once you have these details you are ready to
start using the API.

To access the API the main public endpoint and this documentation is located
at [https://external.futureticketing.ie/v1/public](https://external.futureticketing.ie/v1/public).

To access the Private API the main endpoint and this documentation is located
at [https://external.futureticketing.ie/v1/private](https://external.futureticketing.ie/v1/private).

> Sample API/Key combination

```
api key: 4ce2ecd1-2e30-4d64-8a37-c2f7afd73f48
public key: fbd8923b-81f6-4d41-b119-def3b64bdf02
secret key: 771eb7b5-5ab9-4791-8b7d-ae018fd80fa7
```

## How to access

The Future Ticketing API is organized around REST. Our API has resource-oriented URLs, and uses HTTP response codes to
indicate
API errors. We use built-in HTTP features, HTTP verbs, which are understood by off-the-shelf HTTP clients. We support
cross-origin resource sharing, allowing you to interact securely with our API from a client-side web
application if using your public key (you should never expose your secret API key in any public website’s
client-side code). JSON is returned by all API responses, including errors.

All API requests must be made over HTTPS. Calls made over plain HTTP will fail.

API requests to the Private endpoint without authentication will also fail.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://external.futureticketing.ie/template/v1/postman_collection.json)

> Public API Endpoint

```
https://external.futureticketing.ie/v1/public
```

### General Public Calls

All of the Public endpoints need to include your API Key in the correct location of the request URL. Any
calls made via the public endpoint are subject to being checked against your allowed locations set in the
dashboard. If the calling location does not match the call will fail.

### Private Calls Authentication

All of the Private endpoints require authentication to be made prior to accessing them. To authenticate
you need to call [https://external.futureticketing.ie/oauth/token/{apikey}/{privatekey}](https://external.futureticketing.ie/oauth/token/%7Bapikey%7D/%7Bprivatekey%7D) with a GET request
and pass in your API Key followed by your Private Key in the URL.

> oAuth Token API Endpoint

````

> Example CURL Request
``` php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/oauth/token/'. $apikey .'/'. $secretkey);
curl_setopt($ch, CURLOPT_USERAGENT, 'PHP-MCAPI/2.0');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
````

This request will return a JSON string with a **‘token’** field if succesful.

> Example JSON Response

```json
{"token":"eyJ0eXACJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3UEhaVVRHiwiaWF0IjoxNTA4MjQ5NDE3LCJleHAiOjE1MDgyNDk3MTcsImNpZCI6IjUwIn0._eNXWPs6UbYCd-Afx7icqQ"}
```

### Errors

Future Ticketing uses conventional HTTP response codes to indicate the success or failure of an API request. In general,
codes in the 2xx range indicate success, codes in the 4xx range indicate an error that failed given the
information provided (e.g., a required parameter was omitted, an insert failed, etc.), and codes in the 5xx range
indicate an error with Future Ticketing’s servers (which are rare). Not all errors map cleanly onto HTTP response codes,
however. When a request is valid but does not complete successfully (e.g., a location was not stopped from
performing audits), we return a 402 error code.

> HTTP status code summary
>
> | Status | Desc |
> | --- | --- |
> | **200 - OK** | Everything worked as expected. |
> | **400 - Bad Request** | The request was unacceptable, often due to missing a required parameter. |
> | **401 - Unauthorized** | No valid API key provided. |
> | **402 - Request Failed** | The parameters were valid but the request failed. |
> | **404 - Not Found** | The requested resource doesn’t exist. |
> | **429 - Too Many Requests** | Too many requests hit the API too quickly. |
> | **500, 502, 503, 504 - Server Errors** | Something went wrong on Future TicketingS’s end. |

# Public Resources

All Public Resources can be called via this end point. Depending on the function being called username / password /
token
details may need to be passed with the call. Public resources in general will return less details then Private
resources.

> Sample Resource request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/event/'. $apikey);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

## Login (POST)

_Endpoint : [https://external.futureticketing.ie/v1/public/login/user](https://external.futureticketing.ie/v1/public/login/user)_

This end point allows access to the login function of the dashboard for the passed in API. If the username
does not have access to the client requested login will be denied.

> Sample Login request

```php
$data = array(
    "username" => $_POST['user_name'],
    "password" => $_POST['password']
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/login/user/'. $apikey);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

This request will return a JSON string with a **‘token’** field if succesful and additional user
information.
The **token** field is required by all Private Resources. Certain resources also require the current logged in user to
be
passed to track access to a user.

> Example JSON Response

```json
{
    "token":"eyJ0eXACJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3UEhaVVRHiwiaWF0IjoxNTA4MjQ5NDE3LCJleHAiOjE1MDgyNDk3MTcsImNpZCI6IjUwIn0._eNXWPs6UbYCd-Afx7icqQ",
    "user_id": 120,
    "first_name": "First Name"
}
```

## Account Access

To allow for access or update of an Account to allow for logging in the following end points are available.

### Register _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/public/login/customer/create](https://external.futureticketing.ie/v1/public/login/customer/create)_

This end point allows a customer to register a new account with your Future Ticketing system. Your
Future Ticketing Client UUID needs to be supplied with the request body.

> Sample Register request

```php
$data = array(
    "email" => $_POST['email_address'],
    "password" => $_POST['password'],
    "first_name" => $_POST['first_name'],
    "last_name" => $_POST['last_name'],
    "mobile" => $_POST['mobile_number'],
    "client_uuid" => $FutureTicketingClientUUID
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/login/customer/create');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

If the account was created this request will return a JSON string with a **‘created’** field set to true
and an Account UUID.

> Example JSON Response

```json
{
    "created":true,
    "account_uuid": "253a643e-3706-489c-814a-94e754fe8806"
}
```

### Forgotten Password _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/public/login/customer/forgotpass](https://external.futureticketing.ie/v1/public/login/customer/forgotpass)_

This end point allows a customer to request that their password is reset. If the account is found on the system
an email is sent to the customer with instructions on how to reset their password. The email content is setup as a
Client Setting in the Future Ticketing Dashboard and can be customised to your needs.

The **‘url’** field allows a custom URL to be added to the email text to direct the customer to your
own password reset page. The system will add a “ft\_fp” query string variable to the end of this url that includes
a unique password reset string.

Your Future Ticketing Client UUID needs to be supplied with the request body.

> Sample Forgotten Password request

```php
$data = array(
    "username" => $_POST['email_address'],
    "url" => "https://urltoredirectuser.com",
    "client_uuid" => $FutureTicketingClientUUID
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/login/customer/forgotpass');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

If the account was found and the email sent succesfully the below response will be given.

> Example JSON Response

```json
{
    "sent":true
}
```

### Reset Password _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/public/login/customer/resetpass](https://external.futureticketing.ie/v1/public/login/customer/resetpass)_

This end point allows the resetting of the account password. The unique value “ft\_fp” value that was appended to
the ‘url’ field in the previous ‘Forgotten Password’ call needs to be supplied with the reset password request.

Your Future Ticketing Client UUID needs to be supplied with the request body.

> Sample Reset Password request

```php
$data = array(
    "password_reset" => $ft_fp,
    "password" => $_POST['password'],
    "confirm_password" => $_POST['password_confirm'],
    "client_uuid" => $FutureTicketingClientUUID
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/login/customer/resetpass');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

If the account was found and the password reset succesfully the below response will be given.

> Example JSON Response

```json
{
    "reset":true
}
```

### Login _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/public/login/customer](https://external.futureticketing.ie/v1/public/login/customer)_

This end point allows the customer to login to their account. If the username does not have access to
the client requested or does not exist then login will be denied.

Your Future Ticketing Client UUID needs to be supplied with the request body.

> Sample Login request

```php
$data = array(
    "username" => $_POST['user_name'],
    "password" => $_POST['password'],
    "client_uuid" => $FutureTicketingClientUUID
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/login/customer');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

This request will return a JSON string with a **‘token’** field if succesful and additional user
information.
The **token** field is required by all Private Resources. Certain resources also require the current logged in user to
be
passed to track access to a user.

> Example JSON Response

```json
{
    "token":"eyJ0eXACJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3UEhaVVRHiwiaWF0IjoxNTA4MjQ5NDE3LCJleHAiOjE1MDgyNDk3MTcsImNpZCI6IjUwIn0._eNXWPs6UbYCd-Afx7icqQ",
    "expire": "2023-02-12T15:19:21+00:00",
    "account_id": 123
}
```

## Event (GET)

_Endpoint : [https://external.futureticketing.ie/v1/public/event](https://external.futureticketing.ie/v1/public/event)_

To get a listing of current Events in your database you can use this end point.
The Events are returned sorted by Event ID with the oldest Event appearing first. You
must pass in the client API Key to retrieve the Event details. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Event List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/public/event/'. $apikey);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/public/event/apikey/page/limit/order](https://external.futureticketing.ie/v1/public/event/apikey/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/public/event/apikey/1/20/datetime](https://external.futureticketing.ie/v1/public/event/apikey/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

# Private Resources

All Private Resources expect the **‘token’** received after authenticating with the service
to be sent by means of adding a header to each request. The header should be named **‘Authorization: Bearer ‘** and
include the token at the end of the name. The token is set to auto expire after 45 minutes of non usage. If the
token auto expires a new request to the authentication end point will need to be called.

> Sample Resource request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

## Event

_Endpoint : [https://external.futureticketing.ie/v1/private/event](https://external.futureticketing.ie/v1/private/event)_

This is the main private end point for interacting with an Event object on your Future Ticketing account. Any
interaction available with the Event account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Event ID | int | true |
| internal\_id | Internal Event Code | int | false |
| name | Event Name | string | true |
| description | Event Description | text | true |
| datetime | Event Date/Time | datetime | true |
| featured | Event Featured | int | false |
| discount | Event Discount Amount | decimal | false |
| open\_sales\_datetime | Sales Open Date/Time | datetime | true |
| close\_sales\_datetime | Sales Close Date/Time | datetime | true |
| close\_postage\_datetime | Postage Close Date/Time | datetime | true |
| eticket\_content | eTicket Description | text | false |
| ticket\_content | Printed Ticket Description | text | false |
| allow\_eticket | Allow eTicket send | int | false |
| show\_date | Show Text when embedding event | string | false |
| sales\_closed\_text | Display text when sales are closed | text | false |
| max\_ticket | Capacity for Event | int | false |
| valid | Display Event | int | false |

### List _(GET)_

To get a listing of current Events in your database you can use this end point.
The Events are returned sorted by Event ID with the oldest Event appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

If an Event has a capacity set additional attributes will be returned detailing the amount of
orders currently made ( _event\_sold_) for the Event and the amount of tickets remaining ( _event\_remaining_). This
is also set for each individual Product that is attached to the Event and also has a maximum capacity with the
orders currently made ( _product\_sold_) and the amount of tickets remaining ( _product\_remaining_) for the Product in the
Event.

> Sample Event List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/event/page/limit/order](https://external.futureticketing.ie/v1/private/event/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/event/1/20/datetime](https://external.futureticketing.ie/v1/private/event/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Events(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Events found to be used for paging.

> Sample Event List response

```json
{
    "data" : [{\
            "id" : "1",\
            "internal_id" : null,\
            "name" : "Event Name",\
            "description" : "Event Description",\
            "datetime" : "2018-02-10 00:00:00",\
            "featured" : "0",\
            "discount" : "0.00",\
            "open_sales_datetime" : "2018-02-07 00:00:00",\
            "close_sales_datetime" : "2018-02-23 00:00:00",\
            "close_postage_datetime" : "2018-02-08 12:36:00",\
            "prebook_start_datetime" : "2018-02-02 00:00:00",\
            "prebook_end_datetime" : "2018-02-06 12:36:00",\
            "prebook_fee" : "30",\
            "prebook_expiry_datetime" : "2018-02-09 00:00:00",\
            "eticket_content" : "eTicket description would be here",\
            "ticket_content" : "Printed ticket description would be here",\
            "allow_eticket" : "1",\
            "show_date" : "",\
            "sales_closed_text" : "Sales are now closed",\
            "max_ticket" : "0",\
            "valid" : "0",\
            "archived" : "1",\
            "product" : [{\
                "event_id" : 1,\
                "product_id":"11",\
                "price":"20.00",\
                "cost":"0.00",\
                "vat":"0.00",\
                "discount":"0.00",\
                "stock":"1",\
                "available":"0",\
                "used":"467",\
                "valid":"1",\
                "mandatory":"0",\
                "product_name":"Adult Admission"\
            },\
            {\
                "event_id" : 2,\
                "product_id":"12",\
                "price":"10.00",\
                "cost":"0.00",\
                "vat":"0.00",\
                "discount":"0.00",\
                "stock":"1",\
                "available":"0",\
                "used":"153",\
                "valid":"1",\
                "mandatory":"0",\
                "product_name":"Child Admission"\
            }]\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "145"
}
```

### List _(POST)_

To get a listing of current Events in a **date range** in your database you can use this end point.
The Events are returned sorted by Event ID with the oldest Event appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

If an Event has a capacity set additional attributes will be returned detailing the amount of
orders currently made ( _event\_sold_) for the Event and the amount of tickets remaining ( _event\_remaining_). This
is also set for each individual Product that is attached to the Event and also has a maximum capacity with the
orders currently made ( _product\_sold_) and the amount of tickets remaining ( _product\_remaining_) for the Product in the
Event.

#### Available Search Options

| Name | Value | Type |
| --- | --- | --- |
| **start\_date** | Date to Start the search by | datetime |
| **end\_date** | Date to Finish the search by | datetime |
| **close\_sales\_date** | Date to Finish the search by for Close Sales | datetime |
| **venue\_uuid** | UUID of the Venue to search by | string |
| **force\_venue** | Force only returning Events linked to the Venue sent in **venue\_uuid** | int _(send as 1)_ |
| **active** | Only return Events that are currently active | int _(send as 1)_ |
| **expand\_schedule** | Return any Event Schedules that are between the start\_date and end\_date sent | boolean |
| **schedule\_generate\_date** | When sending a query for Event Schedules a date can be passed that will generate Events linked to the Schedules found on the date | date |
| **check\_capacity** | By default live capacity checks are performed, set to 0 to not perform checks | int |
| **event\_id** | Filter only for the event\_id | int |
| **updated\_since** | Find any Events updated after this date. Dates should be sent in YYYY-MM-DD format | date |
| **product\_category\_id** | Filter for events where products linked to the event is associated with this product\_category\_id | int |
| **check\_venue** | By default any Venue details are returned, set to 0 to not return these details | int |
| **check\_charges** | By default Charges / Delivery Methods are returned, set to 0 to not return these details. Any specific Event or Product pricing set for these charges will not update Products | int |
| **check\_seating** | By default Seating Plan details are returned, set to 0 to not return these details | int |
| **check\_event\_child** | By default any Child Events are returned and checked for capacity, set to 0 to not perform checks | int |
| **check\_event\_parent** | By default any Parents Events are returned and checked for capacity, set to 0 to not perform checks | int |
| **check\_linked\_product** | By default any Products Linked will be returned and full checks for capacity are made, set to 0 to not perform checks | int |
| **check\_product\_category** | By default Product Category details are returned, set to 0 to not return details | int |
| **check\_product\_type** | By default Product Type details are returned, set to 0 to not return details | int |
| **check\_account\_discounts** | The Account Id to be used when checking for Account Category Discounts | int |
| **expand** | Allows to obtain additional details for the items on the expandable options list. | Array of string |

**Expandable options available**

| Name | Description |
| --- | --- |
| organiser | Return list of Event Organisers that may be linked to the Event |
| artist | Return list of Artists that may be linked to the Event |
| sponsor | Return list of Event Sponsors that may be linked to the Event |
| voucher | Return any Vouchers (Access or Discount) that maybe linked to the Event |
| product\_quantity\_discount | Return any Quantity Discounts linked to each Product in the Event. |

> Sample Event List Post request

```php
$data = array(
    "start_date" => date('Y-m-d H:i', strtotime('-1 month')), //2016-11-24 13:00
    "end_date" => date('Y-m-d H:i', strtotime('+1 month')), //2017-01-16 13:00
    "venue_uuid" => "15bbd0b9-d5d6-4699-9675-606fad9d8ca0"
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/event/page/limit/order](https://external.futureticketing.ie/v1/private/event/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/event/1/20/datetime](https://external.futureticketing.ie/v1/private/event/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Events(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Events found to be used for paging.

> Sample Event List response

```json
{
    "data" : [{\
            "id" : "1",\
            "internal_id" : null,\
            "name" : "Event Name",\
            "description" : "Event Description",\
            "datetime" : "2018-02-10 00:00:00",\
            "featured" : "0",\
            "discount" : "0.00",\
            "open_sales_datetime" : "2018-02-07 00:00:00",\
            "close_sales_datetime" : "2018-02-23 00:00:00",\
            "close_postage_datetime" : "2018-02-08 12:36:00",\
            "prebook_start_datetime" : "2018-02-02 00:00:00",\
            "prebook_end_datetime" : "2018-02-06 12:36:00",\
            "prebook_fee" : "30",\
            "prebook_expiry_datetime" : "2018-02-09 00:00:00",\
            "eticket_content" : "eTicket description would be here",\
            "ticket_content" : "Printed ticket description would be here",\
            "allow_eticket" : "1",\
            "show_date" : "",\
            "sales_closed_text" : "Sales are now closed",\
            "max_ticket" : "0",\
            "valid" : "0",\
            "archived" : "1",\
            "product" : [{\
                "event_id" : 1,\
                "product_id":"11",\
                "price":"20.00",\
                "cost":"0.00",\
                "vat":"0.00",\
                "discount":"0.00",\
                "stock":"1",\
                "available":"0",\
                "used":"467",\
                "valid":"1",\
                "mandatory":"0",\
                "product_name":"Adult Admission"\
            },\
            {\
                "event_id" : 2,\
                "product_id":"12",\
                "price":"10.00",\
                "cost":"0.00",\
                "vat":"0.00",\
                "discount":"0.00",\
                "stock":"1",\
                "available":"0",\
                "used":"153",\
                "valid":"1",\
                "mandatory":"0",\
                "product_name":"Child Admission"\
            }]\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "145"
}
```

### Entry _(GET)_

To get scanning details on Entry to an Event use this end point.

> Sample Event Entry request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/entry/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Event Entry response

```json
{
    "data": {
        "event" : [{\
            "id" : "1",\
            "internal_id" : null,\
            "name" : "Event Name",\
            "description" : "Event Description",\
            "datetime" : "2018-02-10 00:00:00",\
            "featured" : "0",\
            "discount" : "0.00",\
            "open_sales_datetime" : "2018-02-07 00:00:00",\
            "close_sales_datetime" : "2018-02-23 00:00:00",\
            "close_postage_datetime" : "2018-02-08 12:36:00",\
            "eticket_content" : "eTicket description would be here",\
            "ticket_content" : "Printed ticket description would be here",\
            "allow_eticket" : "1",\
            "show_date" : "",\
            "sales_closed_text" : "Sales are now closed",\
            "max_ticket" : "0",\
            "valid" : "0",\
            "archived" : "1"\
        }],
        "event_product": [{\
                "event_id": "1",\
                "product_id": "1",\
                "product_name": "Product One",\
                "scanned": "0",\
                "not_scanned": 1026,\
                "total_sold": "1026",\
                "event_specific_product": 0\
            }, {\
                "event_id": "1",\
                "product_id": "2",\
                "product_name": "Product Two",\
                "scanned": "124",\
                "not_scanned": 76,\
                "total_sold": "200",\
                "event_specific_product": 0\
            }, {\
                "event_id": "1",\
                "product_id": "2",\
                "product_name": "Product Three - Membership",\
                "scanned": "74",\
                "not_scanned": 726,\
                "total_sold": "800",\
                "event_specific_product": 1\
            }\
        ],
        "stile" : [{\
            "group_date" : "2018-02-10",\
            "scanner" : "Scanner One",\
            "scanned" : "162",\
            "child" : "11"\
        },{\
            "group_date" : "2018-02-10",\
            "scanner" : "Scanner Two",\
            "scanned" : "36",\
            "child" : "0"\
        }]
    }
}
```

### Ticket Entry _(GET)_

To get a current Event in your database with product listings and redemption details per product.
A search is performed on the ‘event\_id’ field with the information sent via the URL.

> Sample Event Entry request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/entryticket/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Event Entry response

```json
{
    "data": {
        "event" : [{\
            "id" : "1",\
            "internal_id" : null,\
            "name" : "Event Name",\
            "description" : "Event Description",\
            "datetime" : "2018-02-10 00:00:00",\
            "featured" : "0",\
            "discount" : "0.00",\
            "open_sales_datetime" : "2018-02-07 00:00:00",\
            "close_sales_datetime" : "2018-02-23 00:00:00",\
            "close_postage_datetime" : "2018-02-08 12:36:00",\
            "eticket_content" : "eTicket description would be here",\
            "ticket_content" : "Printed ticket description would be here",\
            "allow_eticket" : "1",\
            "show_date" : "",\
            "sales_closed_text" : "Sales are now closed",\
            "max_ticket" : "0",\
            "valid" : "0",\
            "archived" : "1"\
        }],
        "event_product": [{\
                "event_id": "1",\
                "product_id": "1",\
                "product_name": "Product One",\
                "scanned": "0",\
                "not_scanned": 1026,\
                "total_sold": "1026",\
                "event_specific_product": 0\
            }, {\
                "event_id": "1",\
                "product_id": "2",\
                "product_name": "Product Two",\
                "scanned": "124",\
                "not_scanned": 76,\
                "total_sold": "200",\
                "event_specific_product": 0\
            }, {\
                "event_id": "1",\
                "product_id": "2",\
                "product_name": "Product Three - Membership",\
                "scanned": "74",\
                "not_scanned": 726,\
                "total_sold": "800",\
                "event_specific_product": 1\
            }\
        ],
        "scanned" : [{\
            "order_id" : "32",\
            "order_detail_id" : "1456",\
            "barcode" : "369351256790",\
            "stile" : "Scanner One"\
            "scandatetime" : "2018-02-10 09:15:02"\
        },{\
            "order_id" : "34",\
            "order_detail_id" : "4578",\
            "barcode" : "369351488820",\
            "stile" : "Scanner Two"\
            "scandatetime" : "2018-02-10 09:16:00"\
        }]
    }
}
```

### Add _(POST)_

To add a new Event to the system you will need to perform a **POST** request passing an array
of Event objects to the main Event end point.

> Sample Event Add request

```json
JSON
$json = '{"event" :[\
            {\
                "internal_id" : "Internal Code from ePos",\
                "name" : "Event Name 2",\
                "description" : "Event Description",\
                "datetime" : "2018-02-10 00:00:00",\
                "featured" : "0",\
                "discount" : "0.00",\
                "open_sales_datetime" : "2018-02-07 00:00:00",\
                "close_sales_datetime" : "2018-02-23 00:00:00",\
                "close_postage_datetime" : "2018-02-08 12:36:00",\
                "eticket_content" : "eTicket description would be here",\
                "ticket_content" : "Printed ticket description would be here",\
                "allow_eticket" : "1",\
                "show_date" : "",\
                "sales_closed_text" : "Sales are now closed",\
                "max_ticket" : "0",\
                "valid" : "0",\
                "archived" : "1"\
            },\
            {\
                "internal_id" : "Internal Code",\
                "name" : "Event Name 3",\
                "description" : "Event Description",\
                "datetime" : "2018-02-10 00:00:00",\
                "featured" : "0",\
                "discount" : "0.00",\
                "open_sales_datetime" : "2018-02-07 00:00:00",\
                "close_sales_datetime" : "2018-02-23 00:00:00",\
                "close_postage_datetime" : "2018-02-08 12:36:00",\
                "eticket_content" : "eTicket description would be here",\
                "ticket_content" : "Printed ticket description would be here",\
                "allow_eticket" : "1",\
                "show_date" : "",\
                "sales_closed_text" : "Sales are now closed",\
                "max_ticket" : "0",\
                "valid" : "0",\
                "archived" : "1"\
            }\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Event Add response

```json
{
    [\
        "added" : "event",\
        "name" : "Event Name 2",\
        "internal_id" : "Internal Code from ePos",\
        "id" : 2\
    ],
    [\
        "added" : "event",\
        "name" : "Event Name 3",\
        "internal_id" : "Internal Code",\
        "id" : 3\
    ]
}
```

### Update _(PUT)_

To update an Event in the system you will need to perform a **PUT** request passing an array
of Event objects to the main Event end point. You do not need to send all fields when making an
update, only the fields that need to be updated on the system.

> Sample Event Update request

```php
$event_id = $_POST['event_id'];
$json = '{
    "event" : {
        "name" : "New Event Name 3",
        "description" : "New Event Description",
        "featured" : "1"
    }
}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/update/'. $event_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Event Update response

```json
{
    [\
        "updated" : "event",\
        "name" : "New Event Name 3",\
        "internal_id" : "Internal Code"\
    ]
}
```

### Update By Internal ID _(PUT)_

To update an Event by your own Internal ID/Code you will need to perform a **PUT** request passing an array
of Event objects to the main Event end point. You do not need to send all fields when making an
update, only the fields that need to be updated on the system.

> Sample Event Update By Internal ID request

```php
$event_internal_id = $_POST['event_internal_id'];
$json = '{
    "event" : {
        "name" : "Update Location Name",
        "address1" : "Address Update 1",
        "address2" : "Address Update 2"
    }
}';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/updateinternal/'. $event_internal_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Event Update response

```json
{
    [\
        "updated" : "event",\
        "name" : "New Event Name 3",\
        "internal_id" : "Internal Code"\
    ]
}
```

### Archive _(DELETE)_

To archive an Event in the system you will need to perform a **DELETE** request passing
the Event ID to the Archive end point. Doing this will mark the Event as archived on the Future Ticketing system and
will no longer be visible on your website.

> Sample Event Archive request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/archive/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
$result = curl_exec($ch);
```

### Disable _(PUT)_

To disable an Event in the system you will need to perform a **PUT** request passing
the Event ID to the Disable end point. Doing this will mark the Event as invalid on the Future Ticketing system and will
no
longer be visible on your website.

> Sample Event Disable request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/disable/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Event Disable response

```json
{
    [\
        "closed" : "event",\
        "internal_id" : "Internal Code"\
    ]
}
```

### Enable _(PUT)_

To enable an Event in the system you will need to perform a **PUT** request passing
the Event ID to the Enable end point. Doing this will mark the Event as valid on the Future Ticketing system and will
be visible on your website.

> Sample Event Disable request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/enable/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Event Enable response

```json
{
    [\
        "updated" : "event",\
        "internal_id" : "Internal Code"\
    ]
}
```

### Event Group _(GET)_

View any Event Groups that are available in the system.

> Sample Event Group request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/group');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$result = curl_exec($ch);
```

> Sample Event Group response

```json
{
    [\
        "data" : [{\
            "id" : 1,\
            "name" : "Event Group 1",\
            "ordering" : 0,\
            "valid" : true\
        }]\
    ]
}
```

### Event Category Type _(GET)_

View the Event Category Types that are available in the system.

> Sample Event Category Type request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/category_type');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$result = curl_exec($ch);
```

> Sample Event Category Type response

```json
{
    [\
        "data" : [{\
            "id" : 1,\
            "name" : "Standard",\
            "valid" : true\
        }]\
    ]
}
```

### Event Category _(GET)_

View the Event Category that have been added to the system and are linked to an Event.

> Sample Event Category request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/category_type');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$result = curl_exec($ch);
```

> Sample Event Category response

```json
{
    [\
        "data" : [{\
            "id" => 1,\
            "type_id" => 1,\
            "name" => "Club Events",\
            "description" => "Events that are available to Club members",\
            "ordering" => 1,\
            "valid" => true\
        }]\
    ]
}
```

### Event Registration _(POST)_

View the Event Registrations that have been added to the system and are linked to an Event.

The payload can contain any combination of event\_uuid, event\_id , and type.
If the type field is ommited then type will automatically be defaulted to the register type, and will return only this
type.

You can also specify ‘waitlist’ as the type in the body , this will return all records with a waitlist type.

You can pass either event\_id or event\_uuid to look up a specific event, if both are passed we will use the event\_id.
If you want to specifically use the event\_uuid to search for events, then pass the event\_uuid, and ommit the event\_id
from the payload body.

To return all records of a specific type then just pass the type and ommit the event\_id and event\_uuid.

If no body is passed then it will default to return all records for all events with a register type.

> Sample Event Registration request

```php
$data = array(
    "event_uuid" => $_POST['event_uuid'],
    "event_id" => $_POST['event_id'],
    "type" => "register",  //the other option is 'waitlist'
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/registration);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Event Registration response

```json
[\
    {\
        "client_event_register_uuid": "056b085a-cc3d-4995-a286-15e79f3pp378",\
        "client_event_id": "128",\
        "client_product_id": "1",\
        "user_order_account_id": "25",\
        "client_event_register_email": "johndoe@futureticketing.ie",\
        "client_event_register_first_name": "John",\
        "client_event_register_last_name": "Doe",\
        "client_event_register_phone": "1011122324",\
        "client_event_register_date": "2025-06-07",\
        "client_event_register_datetime": "2025-06-07 09:52:16",\
        "client_event_register_type": "10",\
        "client_event_register_status": "10",\
        "client_event_register_extra": ""\
    },\
    {\
        "client_event_register_uuid": "056b085a-cc3d-4995-a286-15e79f3pp382",\
        "client_event_id": "128",\
        "client_product_id": "1",\
        "user_order_account_id": "13",\
        "client_event_register_email": "peterparker@futureticketing.ie",\
        "client_event_register_first_name": Peter,\
        "client_event_register_last_name": Parker,\
        "client_event_register_phone": 123455678,\
        "client_event_register_date": "2025-06-07",\
        "client_event_register_datetime": "2025-06-07 09:52:16",\
        "client_event_register_type": "10",\
        "client_event_register_status": "10",\
        "client_event_register_extra": null\
    }\
]
```

## Product

_Endpoint : [https://external.futureticketing.ie/v1/private/product](https://external.futureticketing.ie/v1/private/product)_

This is the main private end point for interacting with a Product object on your Future Ticketing account. Any
interaction available with the Product account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Product ID | int | true |
| internal\_id | Internal Product Code | int | false |
| category | Product Category ID | id | true |
| name | Product Name | string | true |
| internal\_name | Product Internal Name | string | false |
| description | Product Description | text | true |
| scanner\_text | Text to display when being scanned | text | false |
| scanner\_colour | Colour (hex value) to display on scanner | String | false |
| product\_price | Price of product | decimal | true |
| vat | Tax on product | decimal | false |
| discount | Discount to apply on products | decimal | false |
| min\_purchase | Minimum purchase for this product | int | false |
| product\_order | Ordering of product for display | int | false |
| valid | Display product on website | int | false |
| archive | Archive product on the system | int | false |
| scan\_check\_event\_date | Check date of event when scanning product | int | false |
| scan\_amount | Amount of scans allowed for product | int | false |
| eticket\_content | Content to show on eTicket | text | false |
| ticket\_content | Content to show on printed Ticket | text | false |
| valid\_from | Date the product is allowed to be scanned from | datetime | false |
| valid\_to | Date the product is allowed to be scanned to | datetime | false |
| restrict\_scan | Comma separated list of Event ID’s that this product can be scanned in for. Null / 0 allows all Events | string | false |
| **product\_link** | Optional Array of any Products linked to this one | array | \- |
| id | ID of linking field | int | true |
| parent\_id | Parent Product ID for linking purposes | int | true |
| child\_id | Child Product ID for linking purposes | int | true |
| child\_product\_name | Child Product Name | string | true |
| cost | Cost price of product in link | decimal | true |
| price | Retail price of product in link | decimal | true |
| vat | VAT of product in link | decimal | true |
| ticket\_amount | Amount of tickets to generate | int | true |
| suggested | Type of Link (Bundle, Suggested, Renewal) | int | true |
| valid | Is the link Valid for display | int | true |

### List _(GET)_

To get a listing of current Products in your database you can use this end point.
The Products are returned sorted by Product ID with the oldest Product appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Product List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/product/page/limit/order](https://external.futureticketing.ie/v1/private/product/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/product/1/20/datetime](https://external.futureticketing.ie/v1/private/product/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Product(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Procucts found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id" : "1",\
            "internal_id" : "InternalProductCode",\
            "category" : "Tickets",\
            "name" : "Test Product",\
            "internal_name" : "New Product",\
            "description" : "Product Description",\
            "scanner_text" : "Show to VIP area",\
            "scanner_colour" : "#008800",\
            "product_price" : "0.00",\
            "vat" : "0.00",\
            "discount" : "0.00",\
            "min_purchase" : "1",\
            "product_order" : "0",\
            "valid" : "1",\
            "archive" : "0",\
            "scan_check_event_date" : "1",\
            "scan_amount" : "1",\
            "eticket_content" : "",\
            "ticket_content" : "",\
            "valid_from" : null,\
            "valid_to" : null\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "145"
}
```

### GET _(GET)_

To get a current Product in your database you can use this end point.
A search is performed on the ‘product\_id’ field with the information sent via the URL.

> Sample Product GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Product GET response

```json
{
    "data": [\
        {\
            "id" : "1",\
            "internal_id" : "InternalProductCode",\
            "name" : "Test Product",\
            "internal_name" : "New Product",\
            "description" : "Product Description",\
            "scanner_text" : "Show to VIP area",\
            "scanner_colour" : "#008800",\
            "product_price" : "0.00",\
            "vat" : "0.00",\
            "discount" : "0.00",\
            "min_purchase" : "1",\
            "product_order" : "0",\
            "valid" : "1",\
            "archive" : "0",\
            "scan_check_event_date" : "1",\
            "scan_amount" : "1",\
            "eticket_content" : "",\
            "ticket_content" : "",\
            "valid_from" : null,\
            "valid_to" : null\
        }\
    ]
}
```

### Add _(POST)_

To add a new Product to the system you will need to perform a **POST** request passing an array
of Product objects to the main Product end point.

> Sample Product Add request

```json
JSON
$json = '{"product" :[\
            {\
                "internal_id": "Internal Code 2",\
                "name": "Product Name 2",\
                "internal_name": "ProductName2",\
                "description": "Product Description for website",\
                "scanner_text": "Show to VIP section",\
                "scanner_colour": "#008800",\
                "product_price": "50.00",\
                "vat": "0.00",\
                "discount": "0.00",\
                "min_purchase": "1",\
                "product_order": "0",\
                "valid": "1",\
                "archive": "0",\
                "scan_check_event_date": "1",\
                "scan_amount": "1",\
                "eticket_content": "eTicket description would be here",\
                "ticket_content": "Printed ticket description would be here",\
                "valid_from": "2018-01-20",\
                "valid_to": "2018-12-31"\
            },\
            {\
                "internal_id": "Internal Code 3",\
                "name": "Product Name 3",\
                "internal_name": "ProductName3",\
                "description": "Product Description for website",\
                "scanner_text": "",\
                "scanner_colour": "#008800",\
                "product_price": "45.00",\
                "vat": "0.00",\
                "discount": "0.00",\
                "min_purchase": "1",\
                "product_order": "0",\
                "valid": "1",\
                "archive": "0",\
                "scan_check_event_date": "1",\
                "scan_amount": "1",\
                "eticket_content": "eTicket description would be here",\
                "ticket_content": "Printed ticket description would be here",\
                "valid_from": "",\
                "valid_to": ""\
            },\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Product Add response

```json
{
    [\
        "added" : "product",\
        "name" : "Product Name 2",\
        "internal_id" : "ProductName2",\
        "id" : 2\
    ],
    [\
        "added" : "product",\
        "name" : "Product Name 3",\
        "internal_id" : "ProductName3",\
        "id" : 3\
    ]
}
```

### Update _(PUT)_

To update an Product in the system you will need to perform a **PUT** request passing an array
of Product objects to the main Product end point. You do not need to send all fields when making an
update, only the fields that need to be updated on the system.

> Sample Product Update request

```php
$product_id = $_POST['product_id'];
$json = '{
    "product" : {
        "name" : "New Product Name 3",
        "description" : "New Product Description"
    }
}';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product/update/'. $product_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Product Update response

```json
{
    [\
        "updated" : "product",\
        "name" : "New Product Name 3",\
        "internal_id" : "ProductName3"\
    ]
}
```

### Update By Internal ID _(PUT)_

To update an Product by your own Internal ID/Code you will need to perform a **PUT** request passing an array
of Product objects to the main Product end point. You do not need to send all fields when making an
update, only the fields that need to be updated on the system.

> Sample Product Update By Internal ID request

```php
$product_internal_id = $_POST['product_internal_id'];
$json = '{
    "product" : {
        "name" : "Newest Product Name 3",
        "description" : "Newest Product Description"
    }
}';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product/updateinternal/'. $product_internal_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Product Update response

```json
{
    [\
        "updated" : "product",\
        "name" : "Newest Product Name 3",\
        "internal_id" : "ProductName3"\
    ]
}
```

### Archive _(DELETE)_

To archive a Product in the system you will need to perform a **DELETE** request passing
the Product ID to the Archive end point. Doing this will mark the Product as archived on the Future Ticketing system and
will no longer be visible on your website.

> Sample Product Archive request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/event/product/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
$result = curl_exec($ch);
```

### Disable _(PUT)_

To disable a Product in the system you will need to perform a **PUT** request passing
the Product ID to the Disable end point. Doing this will mark the Product as invalid on the Future Ticketing system and
will no
longer be visible on your website.

> Sample Product Disable request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product/disable/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Product Disable response

```json
{
    [\
        "closed" : "product",\
        "internal_id" : "ProductName3"\
    ]
}
```

### Enable _(PUT)_

To enable an Product in the system you will need to perform a **PUT** request passing
the Product ID to the Enable end point. Doing this will mark the Product as valid on the Future Ticketing system and
will
be visible on your website.

> Sample Product Disable request

```php
$id = $_POST['id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/product/enable/'. $id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
$result = curl_exec($ch);
```

> Sample Product Enable response

```json
{
    [\
        "updated" : "product",\
        "internal_id" : "ProductName3"\
    ]
}
```

## Voucher

_Endpoint : [https://external.futureticketing.ie/v1/private/voucher](https://external.futureticketing.ie/v1/private/voucher)_

This is the main private end point for interacting with a Voucher object on your Future Ticketing account. Any
interaction available with the Voucher account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Voucher ID | int | true |
| type\_id | Type of Voucher | int | false |
| name | Voucher Name | string | true |
| description | Voucher Description | text | true |
| code | Voucher Code | string | true |
| valid\_from | Date the voucher is allowed to be used from | datetime | true |
| valid\_to | Date the voucher is allowed to be used to | datetime | true |
| valid | Allow voucher to be used | int | true |
| amount\_type | Is the Voucher a numeric or percentage figure | int | true |
| amount | Voucher Amount | int | true |
| available | Amount of codes available to use (0 = unlimited) | int | true |
| conjunction | Can this voucher be used in conjunction with other vouchers | int | true |
| archived | Is this code archived | int | true |

### List _(GET)_

To get a listing of current Vouchers in your database you can use this end point.
The Vouchers are returned sorted by Voucher ID with the oldest Voucher appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Voucher List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/voucher');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/voucher/page/limit/order](https://external.futureticketing.ie/v1/private/voucher/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/voucher/1/20/datetime](https://external.futureticketing.ie/v1/private/voucher/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Voucher(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Vouchers found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id" : "1",\
            "type_id" : "1",\
            "name" : "Test Voucher",\
            "description" : "Voucher Description",\
            "code" : "10PEROFF",\
            "start_date" : "2018-01-01 10:00:00",\
            "end_date" : "2018-12-31 35:59:00",\
            "valid" : "1",\
            "amount" : "10",\
            "amount_type" : "1",\
            "available" : "0",\
            "conjunction" : "0",\
            "archived" : "0"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "2"
}
```

## Country

_Endpoint : [https://external.futureticketing.ie/v1/private/country](https://external.futureticketing.ie/v1/private/country)_

This is the main private end point for interacting with a Country object on your Future Ticketing account. Any
interaction available with the Country account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Country ID | int | true |
| name | Country Name | string | true |
| iso | Country ISO Description | string | true |
| display\_order | Order to display the Country | int | true |
| display | Should we display the Country | int | true |

### List _(GET)_

To get a listing of current Country in your database you can use this end point.
The Country are returned sorted by Country ID with the oldest Country appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Country List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/country');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/country/page/limit/order](https://external.futureticketing.ie/v1/private/country/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/country/1/20/iso](https://external.futureticketing.ie/v1/private/country/1/20/iso)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Country(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Countries found to be used for paging.

> Sample Country List response

```json
{
    "data" : [{\
            "id" => 1,\
            "name" => "Ireland",\
            "iso" => "IE",\
            "display_order" => 1,\
            "display" => 1\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

## County

_Endpoint : [https://external.futureticketing.ie/v1/private/county](https://external.futureticketing.ie/v1/private/county)_

This is the main private end point for interacting with a County object on your Future Ticketing account. Any
interaction available with the County account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | County ID | int | true |
| country\_id | Country ID | int | true |
| name | County Name | string | true |
| iso | County ISO Description | string | true |
| display\_order | Order to display the County | int | true |
| display | Should we display the County | int | true |

### List _(GET)_

To get a listing of current County in your database you can use this end point.
The County are returned sorted by County ID with the oldest County appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample County List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/county');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/county/page/limit/order](https://external.futureticketing.ie/v1/private/county/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/county/1/20/iso](https://external.futureticketing.ie/v1/private/county/1/20/iso)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the County(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Counties found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id" => 1,\
            "country_id" => "1",\
            "name" => "Dublin",\
            "iso" => "D",\
            "display_order" => 1,\
            "display" => 1\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

## User

_Endpoint : [https://external.futureticketing.ie/v1/private/user](https://external.futureticketing.ie/v1/private/user)_

This is the main private end point for interacting with a User account on your Future Ticketing account. Any
interaction available with the User object will be made starting at this end point.

#### Attributes

| Name | Value | Type |
| --: | :-- | --: |
| **id** | User ID | int |
| user\_type | User Type | string |
| user\_name | User Name | string |
| first\_name | First Name | string |
| second\_name | Second Name | string |
| created | Date User was created | datetime |
| last\_login | Date User last logged in | datetime |
| invalid\_login | Amount of invalid logins | int |
| active | Is the User active | int |
| deleted | Is the User deleted | int |
| mfa\_active | Is Multi Factor Authentication active | int |
| expiry\_date | Date User expires | datetime |

### List _(GET)_

To get a listing of current User in your database you can use this end point.
The User list is returned sorted by User ID with the oldest User appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample User List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/user');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/user/page/limit/order](https://external.futureticketing.ie/v1/private/user/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/user/1/20/id](https://external.futureticketing.ie/v1/private/user/1/20/id)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the User(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Users found to be used for paging.

> Sample User List response

```json
{
    "data": [\
        {\
            "id": "01",\
            "user_type": "Client Administration",\
            "user_name": "DemoUser",\
            "first_name": "John",\
            "second_name": "Doe",\
            "created": "2014-01-29 20:28:00",\
            "last_login": "2023-09-11 11:12:00",\
            "invalid_login": "0",\
            "active": "1",\
            "deleted": "0",\
            "mfa_active": false,\
            "expiry_date": null\
        }\
    ]
}
```

## Delivery

_Endpoint : [https://external.futureticketing.ie/v1/private/delivery](https://external.futureticketing.ie/v1/private/delivery)_

This is the main private end point for interacting with a Delivery object on your Future Ticketing account. Any
interaction available with the Delivery account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Delivery ID | int | true |
| name | Delivery Name | string | true |
| description | Delivery Description | string | true |
| amount | Delivery Cost | decimal(18,2) | true |
| display\_order | Order to display the Delivery | int | true |
| display | Should we display the Delivery | int | true |
| type\_eticket | Is this Delivery option an eTicket type | int | false |
| type\_postage | Is this Delivery option a Postage type | int | false |
| type\_collection | Is this Delivery option a Collection type | int | false |

### List _(GET)_

To get a listing of current Delivery in your database you can use this end point.
The Delivery are returned sorted by Delivery ID with the oldest Delivery appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Delivery List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/delivery');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/delivery/page/limit/order](https://external.futureticketing.ie/v1/private/delivery/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/delivery/1/20/name](https://external.futureticketing.ie/v1/private/delivery/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Delivery(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Deliveries found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id": "2",\
            "name": "Email Tickets",\
            "description": null,\
            "amount": "0.00",\
            "display_order": "1",\
            "type_eticket": "1",\
            "type_postage": "0",\
            "type_collection": "0"\
        }, {\
            "id": "3",\
            "name": "Post - Standard",\
            "description": null,\
            "amount": "2.00",\
            "display_order": "2",\
            "type_eticket": "0",\
            "type_postage": "1",\
            "type_collection": "0"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

## Charge

_Endpoint : [https://external.futureticketing.ie/v1/private/charge](https://external.futureticketing.ie/v1/private/charge)_

This is the main private end point for interacting with a Charge object on your Future Ticketing account. Any
interaction available with the Charge account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Charge ID | int | true |
| name | Charge Name | string | true |
| description | Charge Description | string | true |
| amount | Charge Cost | decimal(18,2) | true |
| display\_order | Order to display the Charge | int | true |
| display | Should we display the Charge | int | true |
| type\_eticket | Is this Charge option an eTicket type | int | false |
| type\_postage | Is this Charge option a Postage type | int | false |
| type\_collection | Is this Charge option a Collection type | int | false |

### List _(GET)_

To get a listing of current Charge in your database you can use this end point.
The Charge are returned sorted by Charge ID with the oldest Charge appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Charge List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/charge');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/charge/page/limit/order](https://external.futureticketing.ie/v1/private/charge/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/charge/1/20/name](https://external.futureticketing.ie/v1/private/charge/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Charge(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Deliveries found to be used for paging.

> Sample Product List response

```json
{
    "data" : [\
         {\
            "id": "1",\
            "name": "Handling Fee",\
            "description": "dd",\
            "amount": "1.00",\
            "display": "1",\
            "display_order": "0",\
            "type_eticket": "0",\
            "type_postage": "0",\
            "type_collection": "0",\
            "external_code": null\
        },\
        {\
            "id": "2",\
            "name": "Email Tickets",\
            "description": "",\
            "amount": "0.00",\
            "display": "1",\
            "display_order": "1",\
            "type_eticket": "1",\
            "type_postage": "0",\
            "type_collection": "0",\
            "external_code": null\
        },\
        {\
            "id": "3",\
            "name": "Standard",\
            "description": "",\
            "amount": "3.00",\
            "display": "1",\
            "display_order": "2",\
            "type_eticket": "0",\
            "type_postage": "1",\
            "type_collection": "0",\
            "external_code": null\
        },\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

## Allowed Site

_Endpoint : [https://external.futureticketing.ie/v1/private/site](https://external.futureticketing.ie/v1/private/site)_

This is the main private end point for interacting with an Allowed Site object on your Future Ticketing account. Any
interaction available with the Allowed Site will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Delivery ID | int | true |
| name | Allowed Site Name | string | true |
| url | Allowed Site URL | string | true |
| valid | Is this site valid | int | true |

### List _(GET)_

To get a listing of Allowed Site(s) in your database you can use this end point.
The Allowed Site are returned sorted by Allowed Site ID with the oldest Allowed Site appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Allowed Site List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/site');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/site/page/limit/order](https://external.futureticketing.ie/v1/private/site/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/site/1/20/url](https://external.futureticketing.ie/v1/private/site/1/20/url)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Allowed Site(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Allowed Sites found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Future Ticketing API",\
            "url": "https://external.futureticketing.ie",\
            "valid": "1"\
        }, {\
            "id": "2",\
            "name": "Future Ticketing Website",\
            "url": "https://www.futureticketing.ie",\
            "valid": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

## Donation

_Endpoint : [https://external.futureticketing.ie/v1/private/donation](https://external.futureticketing.ie/v1/private/donation)_

This is the main private end point for interacting with an Donation object on your Future Ticketing account. Any
interaction available with the Donation will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | ID | int | true |
| name | Donation Name | string | true |
| description | Description | string | true |
| logo | Logo image if available | url | false |
| start\_date | Start of donation campaign | datetime | true |
| end\_date | End of donation campaign | datetime | true |
| valid | Is this site valid | int | true |

### List _(GET)_

To get a listing of Donation(s) in your database you can use this end point.
The Donation are returned sorted by Donation ID with the oldest Donation appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Donation List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/donation');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/donation/page/limit/order](https://external.futureticketing.ie/v1/private/donation/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/site/1/20/url](https://external.futureticketing.ie/v1/private/site/1/20/url)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Donation(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Donations found to be used for paging.

> Sample Donation List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Worthy Cause",\
            "description": "Please support this worthy cause.",\
            "logo":"https://external.futureticketing.ie/path/to/image.png",\
            "start_date":"2020-03-12",\
            "end_date":"2020-12-31",\
            "valid": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

## Scanner Location

_Endpoint : [https://external.futureticketing.ie/v1/private/scanner](https://external.futureticketing.ie/v1/private/scanner)_

This is the main private end point for interacting with a Scanner Location object on your Future Ticketing account. Any
interaction available with the Scanner Location will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Scanner ID | int | true |
| name | Scanner Name | string | true |
| internal\_name | Scanner Internal Name | string | true |
| valid | Is this Scanner Location valid | int | true |

### List _(GET)_

To get a listing of Scanner Location(s) in your database you can use this end point.
The Scanner Locations are returned sorted by Scanner Location ID with the oldest appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Scanner Location List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/scanner');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/scanner/page/limit/order](https://external.futureticketing.ie/v1/private/scanner/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/scanner/1/20/name](https://external.futureticketing.ie/v1/private/scanner/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Scanner Location(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Scanner Locations found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Turnstile 1",\
            "internal_name": "Building 1 Turnstile 1",\
            "valid": "1"\
        }, {\
            "id": "2",\
            "name": "Turnstile 2",\
            "url": "Building 1 Turnstile 2",\
            "valid": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

### GET _(GET)_

To get a single Scanner Location in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

Additional _product\_link_ and _product\_category\_link_ attributes may be returned if the Scanner Location
has been linked to specific products or product categories.

> Sample Scanner Location GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/scanner/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Scanner GET response

```json
{
    "data": [{\
            "id": "1",\
            "name": "Turnstile 1",\
            "internal_name": "Building 1 Turnstile 1",\
            "valid": "1",\
            "product_link": [{\
                    "id": "87",\
                    "product_id": "911",\
                    "scanner_id": "1"\
                }, {\
                    "id": "95",\
                    "product_id": "934",\
                    "scanner_id": "1"\
                }, {\
                    "id": "96",\
                    "product_id": "955",\
                    "scanner_id": "1"\
                }\
            ],\
            "product_category_link": []\
        },{\
            "id": "2",\
            "name": "Turnstile 2",\
            "internal_name": "Building 1 Turnstile 2",\
            "valid": "1",\
            "product_link": [],\
            "product_category_link": [{\
                    "product_category_id" : "1",\
                    "scanner_id" : "2"\
                }\
            ]\
        }\
    ]
}
```

## Extra Field

_Endpoint : [https://external.futureticketing.ie/v1/private/extrafield](https://external.futureticketing.ie/v1/private/extrafield)_

This is the main private end point for interacting with an Extra Field object on your Future Ticketing account. Any
interaction available with the Extra Field will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Extra Field ID | int | true |
| name | Extra Field Name | string | true |
| title | Extra Field Display Title | string | true |
| type | The [Type of Input](https://external.futureticketing.ie/#status-tables-extra-field-type) field to display | string | true |
| default\_value | Default value to show in input/textarea boxes | string | false |
| depend | Array of Extra Field ID’s that this extra field is dependant on | array | false |
| display\_order | Display Order of the Extra Field | int | true |
| required | Is this Extra Field required | int | true |
| display | Should the Extra Field be displayed | int | true |
| event\_link | Array of Event ID’s that this extra field is displayed when purchased | array | false |
| single | Should this Extra Field only be asked once no matter how many products are purchased | int | true |
| deleted | Has this Extra Field been marked as deleted | int | true |

### List _(GET)_

To get a listing of Extra Field(s) in your database you can use this end point.
The Extra Field are returned sorted by Extra Field ID with the oldest appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Extra Field List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/extrafield');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/extrafield/page/limit/order](https://external.futureticketing.ie/v1/private/extrafield/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/extrafield/1/20/name](https://external.futureticketing.ie/v1/private/extrafield/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Extra Field(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Extra Fields found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "DateOfBirth",\
            "title": "Date of Birth",\
            "type": "datetimeflat",\
            "default_value": null,\
            "placeholder": null,\
            "depend": null,\
            "display_order": "1",\
            "required": "0",\
            "display": "0",\
            "event_link": "0",\
            "single": "0",\
            "deleted": "0",\
            "product_link": [{\
                    "product_id": "1",\
                    "product_name": "Product 1"\
                }\
            ],\
            "extra_field_value": []\
        },{\
            "id": "2",\
            "name": "MemberSecondName",\
            "title": "Second Name",\
            "type": "text",\
            "default_value": null,\
            "placeholder": "Enter Second Name for Membership Card",\
            "depend": null,\
            "display_order": "2",\
            "required": "1",\
            "display": "1",\
            "event_link": "0",\
            "single": "0",\
            "deleted": "0",\
            "product_link": [{\
                    "product_id": "2",\
                    "product_name": "Season Ticket 1"\
                }\
            ],\
            "extra_field_value": []\
        },{\
            "id": "3",\
            "name": "HearAboutUs",\
            "title": "Where Did you Hear About Us",\
            "type": "dropdown",\
            "default_value": null,\
            "placeholder": null,\
            "depend": null,\
            "display_order": "3",\
            "required": "1",\
            "display": "1",\
            "event_link": "0",\
            "single": "0",\
            "deleted": "0",\
            "product_link": [],\
            "extra_field_value": [{\
                    "id" : "1",\
                    "extra_field_id" : "3",\
                    "name" : "SearchEngine",\
                    "value" : "Search Engine",\
                    "display" : "1"\
                },{\
                    "id" : "2",\
                    "extra_field_id" : "3",\
                    "name" : "WordOfMouth",\
                    "value" : "Word Of Mouth",\
                    "display" : "1"\
                }\
            ]\
        }\
    ],
    "currentpage" : 1,
    "limit" : "2",
    "total" : "2"
}
```

### GET _(GET)_

To get a single Extra Field in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

Additional _product\_link_ and _extra\_field\_value_ attributes may be returned if the Extra Field
has been linked to specific products or has extra values associated with it.

> Sample Extra Field Location GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/extrafield/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Extra Field GET response

```json
{
    "data": [{\
            "id": "1",\
            "name": "DateOfBirth",\
            "title": "Date of Birth",\
            "type": "datetimeflat",\
            "default_value": null,\
            "placeholder": null,\
            "depend": null,\
            "display_order": "1",\
            "required": "0",\
            "display": "0",\
            "event_link": "0",\
            "single": "0",\
            "deleted": "0",\
            "product_link": [{\
                    "product_id": "1",\
                    "product_name": "Product 1"\
                }\
            ],\
            "extra_field_value": []\
        }\
    ]
}
```

## Order Sales Channel

_Endpoint : [https://external.futureticketing.ie/v1/private/saleschannel](https://external.futureticketing.ie/v1/private/saleschannel)_

This is the main private end point for interacting with a Sales Channel object on your Future Ticketing account. Any
interaction available with the Sales Channel account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Sales Channel ID | int | true |
| name | Sales Channel Name | string | true |
| code | Sales Channel Code | string | true |
| display | Should we display the Sales Channel | int | true |

### List _(GET)_

To get a listing of current Sales Channel in your database you can use this end point.
The Sales Channel are returned sorted by Sales Channel ID with the oldest Sales Channel appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Sales Channel List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/saleschannel');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/saleschannel/page/limit/order](https://external.futureticketing.ie/v1/private/saleschannel/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/saleschannel/1/20/name](https://external.futureticketing.ie/v1/private/saleschannel/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Sales Channel(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Counties found to be used for paging.

> Sample Product List response

```json
{
    "data" : [{\
            "id" => 2,\
            "name" => "Website",\
            "code" => "website",\
            "display" => 1\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

## Orders

_Endpoint : [https://external.futureticketing.ie/v1/private/order](https://external.futureticketing.ie/v1/private/order)_

This is the main private end point for interacting with an Order object on your Future Ticketing account. Any
interaction available with the Order account will be made starting at this end point.

## Order Renewals

This section details out the Order Renewal process that is available on the Future Ticketing system. This
renewal process is merged into the Embed Code and needs integration into your website.

### Previous _(GET)_

To get a listing of previous Order ID(s) for an Email address in your database you can use this end point.
The Orders are returned sorted by Event ID with the oldest Orders appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Order Email Search request

```php
$email_search = $_POST['email_search'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/previous/'. $email_search);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order -
_[https://external.futureticketing.ie/v1/private/order/previous/email\_search/page/limit/order](https://external.futureticketing.ie/v1/private/order/previous/email_search/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/order/previous/test@email.com/1/20/id](https://external.futureticketing.ie/v1/private/order/previous/test@email.com/1/20/id)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Order(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Orders found to be used for paging.

> Sample Order List response

```json
{
    "data" : [\
        {\
            "id": "54",\
            "account_uuid": "ca79e673-52cd-4cb9-ab87-2fd145836c22",\
            "previous_id": null,\
            "user_order_uuid": null,\
            "user_id": "77",\
            "payment_id": "183721214124519",\
            "status_id": "7",\
            "order_amount": "8.00",\
            "order_date_time": "2016-12-14 12:45:18",\
            "order_email": "test@email.com",\
            "order_company": null,\
            "order_title": null,\
            "first_name": "Jim",\
            "second_name": "Magee",\
            "address1": "Add1",\
            "address2": "Add2",\
            "address3": null,\
            "address4": "Add4",\
            "address5": null,\
            "address6": null,\
            "county": "County",\
            "postcode": "",\
            "country_id": "1",\
            "phone": "+353574567892",\
            "payment_method_id": "12",\
            "payment_provider": "",\
            "payment_result": null,\
            "accept_terms": "1",\
            "accept_moreinfo": "0",\
            "accept_moreinfo2": "0",\
            "show_price": "1",\
            "currency": "EUR",\
            "delivery_id": "2",\
            "site_id": null\
        },\
        {\
            "id": "55",\
            "previous_id": null,\
            "user_order_uuid": null,\
            "user_id": "77",\
            "payment_id": "183721214122419",\
            "status_id": "7",\
            "order_amount": "8.00",\
            "order_date_time": "2016-12-14 13:45:18",\
            "order_email": "testing@email.com",\
            "order_company": null,\
            "order_title": null,\
            "first_name": "Josephine",\
            "second_name": "Magee",\
            "address1": "Add1",\
            "address2": "Add2",\
            "address3": null,\
            "address4": "Add4",\
            "address5": null,\
            "address6": null,\
            "county": "County",\
            "postcode": "",\
            "country_id": "1",\
            "phone": "+353574567726",\
            "payment_method_id": "12",\
            "payment_provider": "",\
            "payment_result": null,\
            "accept_terms": "1",\
            "accept_moreinfo": "0",\
            "accept_moreinfo2": "0",\
            "show_price": "1",\
            "currency": "EUR",\
            "delivery_id": "2",\
            "site_id": null\
        }\
    ],
    "currentpage" : 1,
    "limit" : "20",
    "total" : "2"
}
```

### Previous By Event _(GET)_

To get a listing of previous Order ID(s) for an Email address in a specific Event in your database you can use this end
point.
The Orders are returned sorted by Event ID with the oldest Orders appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Order Email Search request

```php
$email_search = $_POST['email_search'];
$event_id = $_POST['event_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/previousevent/'. $email_search .'/'. $event_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order -
_[https://external.futureticketing.ie/v1/private/order/previous/\[—email\_search—\]/\[—event\_id—\]/page/limit/order](https://external.futureticketing.ie/v1/private/order/previous/[--email_search--]/[--event_id--]/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/order/previous/test@email.com/123/1/20/id](https://external.futureticketing.ie/v1/private/order/previous/test@email.com/123/1/20/id)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Order(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Orders found to be used for paging.

> Sample Order List response

```json
{
    "data" : [\
        {\
            "id": "54",\
            "previous_id": null,\
            "user_order_uuid": null,\
            "user_id": "77",\
            "payment_id": "183721214124519",\
            "status_id": "7",\
            "order_amount": "8.00",\
            "order_date_time": "2016-12-14 12:45:18",\
            "order_email": "test@email.com",\
            "order_company": null,\
            "order_title": null,\
            "first_name": "Jim",\
            "second_name": "Magee",\
            "address1": "Add1",\
            "address2": "Add2",\
            "address3": null,\
            "address4": "Add4",\
            "address5": null,\
            "address6": null,\
            "county": "County",\
            "postcode": "",\
            "country_id": "1",\
            "phone": "+353574567892",\
            "payment_method_id": "12",\
            "payment_provider": "",\
            "payment_result": null,\
            "accept_terms": "1",\
            "accept_moreinfo": "0",\
            "accept_moreinfo2": "0",\
            "show_price": "1",\
            "currency": "EUR",\
            "delivery_id": "2",\
            "site_id": null\
        },\
        {\
            "id": "55",\
            "previous_id": null,\
            "user_order_uuid": null,\
            "user_id": "77",\
            "payment_id": "183721214122419",\
            "status_id": "7",\
            "order_amount": "8.00",\
            "order_date_time": "2016-12-14 13:45:18",\
            "order_email": "testing@email.com",\
            "order_company": null,\
            "order_title": null,\
            "first_name": "Josephine",\
            "second_name": "Magee",\
            "address1": "Add1",\
            "address2": "Add2",\
            "address3": null,\
            "address4": "Add4",\
            "address5": null,\
            "address6": null,\
            "county": "County",\
            "postcode": "",\
            "country_id": "1",\
            "phone": "+353574567726",\
            "payment_method_id": "12",\
            "payment_provider": "",\
            "payment_result": null,\
            "accept_terms": "1",\
            "accept_moreinfo": "0",\
            "accept_moreinfo2": "0",\
            "show_price": "1",\
            "currency": "EUR",\
            "delivery_id": "2",\
            "site_id": null\
        }\
    ],
    "currentpage" : 1,
    "limit" : "20",
    "total" : "2"
}
```

### Renew _(GET)_

To use the ‘Renew’ function of the Future Ticketing Embed code you would send an email address to this endpoint.
It will return an encrypted key that can be used by the Embed code to securely allow a customer to renew
season/membership
tickets on your website.

> Sample Renew Search request

```php
$email_search = $_POST['email_search'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/renew/'. $email_search);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will include the key that should be passed to the
embed code to allow it to load the previous order and decide on what options the customer has to renew.

> Sample Rewnew response

```json
{
    "data" : "0asd3as7-bf21-34as-r434-2asd34rasd"
}
```

### Renew by Event _(GET)_

To use the ‘Renew By Event’ function of the Future Ticketing Embed code you would send an email address and Event ID to
this endpoint.
It will return an encrypted key that can be used by the Embed code to securely allow a customer to renew
season/membership
tickets on your website based on a specific Event.

There is an optional argument that can be sent in at the end of the URL to force the customer directly to the Checkout
page and not allow updating of the Order detail. Placing 1 at
the end of the request will force the embed code to display the Checkout on page load. For
example - \* [https://external.futureticketing.ie/v1/private/order/renewevent/\[—email\_search—\]/\[—event\_id—\]/1](https://external.futureticketing.ie/v1/private/order/renewevent/[--email_search--]/[--event_id--]/1)

> Sample Renew By Event Search request

```php
$email_search = $_POST['email_search'];
$event_id = $_POST['event_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/renewevent/'. $email_search .'/'. $event_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will include the key that should be passed to the
embed code to allow it to load the previous order and decide on what options the customer has to renew.

> Sample Renew By Event response

```json
{
    "data" : "0asd3as7-bf21-34as-r434-2asd34rasd"
}
```

## Order Creating

This section details out the Order Creation/Update process that is available on the Future Ticketing system. This
allows you to create an order on your dashboard via the API. As a default payment is not handled via this end point.

### Add _(POST)_

To Add an order to your database you can use this end point.
To add a new Order to the system you will need to perform a **POST** request passing an array of Orders objects to the
end point.
If the order is added to the system you will receive a JSON array with the Order ID and a listing of tickets including
the EAN13 barcode.

**Voucher Cards**

To buy voucher cards, you can add voucher card products here as you would normal admission tickets. The system will
recognise that these products should be voucher cards by the “event\_id” and create the codes, balances and account links
required.

Email addresses must be provided for voucher card purchases.

This is to ensure voucher cards are linked to a user account, which will be updated or created from the email address
provided.

**Rewards4Racing**

Guidance on implementing Rewards4Racing loyalty programme can be found [here](https://external.futureticketing.ie/v1/howto#rewards4racing)\*\*.

Certain values being added to an order need to be linked to the respective ID’s. A listing of these values are included
in the below table.

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **user\_id** | The ID of the user making the order. If an ID is not available the full username can be sent or if no user is needed then send 0 | int/string | true |
| **payment\_id** | A unique string to reference the Order against. If not sent one will be generated | string | false |
| **status\_id** | The [Order Status](https://external.futureticketing.ie/#status-tables-order-status) to add the Order as. | int | true |
| **sales\_channel\_id** | The [Sales Channel](https://external.futureticketing.ie/#private-resources-order-sales-channel) to add the Order as. Will default to 4 - API if not sent. | int | false |
| **order\_date\_time** | The Date/Time of the order. If not sent one will be generated | datetime (YYYY-MM-DD HH:MM) | false |
| **first\_name** | First Name of Customer | string | false |
| **second\_name** | First Name of Customer | string | false |
| **order\_email** | Order Email Address | string | false |
| **address1** | Address Line 1 of Customer | string | false |
| **address2** | Address Line 2 of Customer | string | false |
| **address3** | Address Line 3 of Customer | string | false |
| **address4** | Address Line 4 of Customer | string | false |
| **address5** | Address Line 5 of Customer | string | false |
| **address6** | Address Line 6 of Customer | string | false |
| **postcode** | Address Postcode | string | false |
| **phone** | Phone Number | string | false |
| **country\_id** | The [Country](https://external.futureticketing.ie/#private-resources-country) to store for the Order. If not sent the country set for the client will be used. | int | false |
| **delivery\_id** | The [Delivery](https://external.futureticketing.ie/#private-resources-delivery) type to store for the Order. | int | true |
| **site\_id** | The [Site](https://external.futureticketing.ie/#private-resources-allowed-site) to store for the Order | int | true |
| **venue\_id** | The [Venue](https://external.futureticketing.ie/#private-resources-venue) to store for the Order | int | false |
| **payment\_method\_id** | The [Payment Method](https://external.futureticketing.ie/#status-tables-payment-provider) for this order | int | true |
| **payment\_provider** | Text version of the Payment Provider | string | false |
| **payment\_result** | Result from the payment provider | string | false |
| **currency** | Currency to store for the Order. 3 Letter ISO Code | string | true |
| **seat\_reservation\_token** | Reservation Token to use if Seating Plan has been used to select seats | string | false |
| **check\_capacity** | Should the system check that there is capacity available before adding order. Set as 1 to request capacity check. | int | false |
| **product\_handling\_fee** | Should the system add any Handling Fee set for a Product to the Order Detail. Set as 1 to request Handling Fee is added automatically. | int | false |
| **user\_order\_detail** | Detail of the Order Line Items | array | true |
| event\_id | ID for the Event being purchased | int | true |
| product\_id | ID for the Product being purchased | int | true |
| product\_price | Value for the Product being purchased | decimal | true |
| quantity | Quantity of the Product being purchased | int | true |
| detail\_type\_id | Type of item being inserted. Defaults to 1 for a Product. Additional charges such as Handling Fee would be sent as 2. If sending a Voucher Code use 3. If sending a Donation use 4. | int | false |
| seat | Full Seat designation if the Event is a seated Event | string | false |
| seat\_type | Type of Seat being purchased (Seat / General Admission). Required if sending ‘seat’ attribute | string | false |

> Sample Order Add request

```json
JSON
$json = '{"order" :[\
            {\
                "user_id" => 0,\
                "payment_id" => 1,\
                "status_id" => 1,\
                "order_amount" => 20,\
                "order_date_time" => '2018-07-18 13:04',\
                "order_email" => "jim@futureticketing.ie",\
                "order_company" => "",\
                "order_title" => "Mr",\
                "first_name" => "Jim",\
                "second_name" => "Magge",\
                "address1" => "address 1",\
                "address2" => "address 2",\
                "address3" => "address 3",\
                "address4" => "address 4",\
                "address5" => "address 5",\
                "address6" => "address 6",\
                "county" => "county",\
                "postcode" => "postcode",\
                "country_id" => 1,\
                "phone" => "123123",\
                "payment_method_id" => 1,\
                "payment_provider" => 'Cash',\
                "payment_result" => '',\
                "accept_terms" => 1,\
                "accept_moreinfo" => 0,\
                "currency" => 'EUR',\
                "delivery_id" => 1,\
                "site_id" => 1,\
                "user_order_detail" => array(\
                    array(\
                        "event_id" => $test_event_id,\
                        "product_id" => $test_product_id,\
                        "product_price" => 5,\
                        "product_vat" => 0,\
                        "quantity" => 1,\
                        "seat": "H-1",\
                        "seat_type" : "Seat"\
                    ),array(\
                        "event_id" => $test_event_id,\
                        "product_id" => $test_product_id,\
                        "product_price" => 10,\
                        "product_vat" => 0,\
                        "quantity" => 2,\
                        "seat": "H-2",\
                        "seat_type" : "Seat"\
                    )\
                )\
            }\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Order Add response

```json
JSON
[\
    {\
        "added": "order",\
        "id": 21586,\
        "order_uuid": "6255c9e1-43ad-4445-9471-0561f067b5a6",\
        "order_detail": [{\
                "event_id": 1956,\
                "event_name": "test event",\
                "event_date": "2022-01-10 10:01:31",\
                "product_name": "Product1",\
                "product_id": 1035,\
                "ticket_quantity": "3",\
                "ticket_price": "22.00",\
                "ticket_vat": 0,\
                "ticket_type": 0,\
                "scan_amount": 0,\
                "bundle": false,\
                "order_detail_id": 40369\
            }\
        ]\
        "ticket": [{\
                "barcode_ean13": "4614161207701",\
                "scans_available": "1",\
                "event_id": 1956,\
                "event_name": "test event",\
                "product_id": 1035,\
                "product_name": "Product1",\
                "seat": "H-1"\
            }, {\
                "barcode_ean13": "4614261707200",\
                "scans_available": "1",\
                "event_id": 1956,\
                "event_name": "test event",\
                "product_id": 1035,\
                "product_name": "Product1",\
                "seat": "H-2"\
            }, {\
                "barcode_ean13": "4614261738907",\
                "scans_available": "1",\
                "event_id": 1956,\
                "event_name": "test event",\
                "product_id": 1035,\
                "product_name": "Product1",\
                "seat": "H-3"\
            }\
        ],\
        "payment_provider_id" : "310270115125433",\
        "download_link" : "",\
        "seat_reservation_token" : "0ca1d47a-8838-4883-a707-174d731cccd8"\
    }\
]
```

### Update _(POST)_

To Update an order to your database you can use this end point.
To update an Order to the system you will need to perform a **POST** request passing the Order ID in the URL and array
containing an Order object to the end point.
If the order is updated you will receive a JSON array with the Order ID and an updated listing of the full order. Only
fields passed in the Order object will be updated i.e. if
a field is not sent then that field will not be updated in the database. Sending ‘user\_order\_detail’ or ‘extra\_detail’
objects will allow you to update the Order Detail lines and/or
the Extra Fields object associated with the Order.

Certain values being updated in an order need to be linked to the respective ID’s. A listing of these values are
included in the below table.

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **user\_id** | The ID of the user making the order. If an ID is not available the full username can be sent or if no user is needed then send 0 | int/string | false |
| **status\_id** | The [Order Status](https://external.futureticketing.ie/#status-tables-order-status) to update the Order to | int | true |
| **country\_id** | The [Country](https://external.futureticketing.ie/#private-resources-country) to store for the Order | int | false |
| **delivery\_id** | The [Delivery](https://external.futureticketing.ie/#private-resources-delivery) type to store for the Order | int | false |
| **site\_id** | The [Site](https://external.futureticketing.ie/#private-resources-allowed-site) to store for the Order | int | false |
| **payment\_method\_id** | The [Payment Method](https://external.futureticketing.ie/#status-tables-payment-provider) for this order | int | false |
| **payment\_provider** | Text version of the Payment Provider | string | false |
| **payment\_result** | Result from the payment provider | string | false |

> Sample Order Update request

```json
JSON
$json = '{"order" :[\
            {\
                "address1" => "address 1 Update",\
                "address2" => "address 2",\
                "address3" => "address 3 Update",\
                "address4" => "address 4",\
                "address5" => "address 5 Update",\
                "address6" => "address 6",\
                "user_order_detail" => [\
                    {\
                        "id" =>  "46666",\
                        "parent_id" =>  null,\
                        "product_type" =>  "1",\
                        "event_id" =>  "1956",\
                        "event" =>  "test event",\
                        "event_date" =>  "2018-02-10 00:00:00",\
                        "product_id" =>  "1035",\
                        "product" =>  "Product1",\
                        "quantity" =>  "1",\
                        "product_price" =>  "10.00",\
                        "product_vat" =>  "0.00",\
                        "suggested" =>  "0",\
                        "delete" => "Yes"\
                    },{\
                        "id" =>  "46667",\
                        "parent_id" =>  null,\
                        "product_type" =>  "1",\
                        "event_id" =>  "1956",\
                        "event" =>  "test event",\
                        "event_date" =>  "2018-02-10 00:00:00",\
                        "product_id" =>  "1035",\
                        "product" =>  "Product1",\
                        "quantity" =>  "2",\
                        "product_price" =>  "5.00",\
                        "product_vat" =>  "0.00",\
                        "suggested" =>  "0"\
                    }\
                ],\
                "extra_detail" => [\
                    {\
                        "id" => 3782,\
                        "extra_field_id"  =>  "1",\
                        "extra_field_value"  =>  "10/06/1982",\
                        "ticket_id" => 690431\
                    },\
                    {\
                        "id" => 3781,\
                        "extra_field_id"  =>  "2",\
                        "extra_field_value"  =>  "Joe Bloggs Updated",\
                        "ticket_id" => 690431\
                    }\
                ]\
            }\
        ]
    }';
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/update/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Order Update response

```json
{
    [\
        {\
            "updated": "order/update",\
            "id": 21586\
        }\
    ]
}
```

### Cart Add _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/cart/:order\_uuid](https://external.futureticketing.ie/v1/private/order/cart/:order_uuid)_

This API endpoint is used to add items to a user’s cart for a specific order. It allows the addition of one or more
products to the cart along with their respective details such as product ID, price, VAT, and quantity.

The request body should be in JSON format and include the following parameters:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| event\_id | Event ID | int | true |
| product\_id | Product ID | int | true |
| quantity | Quantity of the Product being purchased | int | true |
| product\_price | Product Price | decimal | false |
| product\_vat | Product VAT value | decimal | false |
| check\_capacity | Should the system check that there is capacity available before adding order. Set as 1 to request capacity check. | int | false |
| product\_handling\_fee | Should the system add any Handling Fee set for a Product to the Order Detail. Set as 1 to request Handling Fee is added automatically. | int | false |

The request body should be in JSON format and include the following parameters:

> Sample Request Body

```json
{
    "order": {
        "user_order_detail": [\
            {\
                "event_id": 5,\
                "product_id": 2,\
                "product_price" : 5,\
                "product_vat" : 0,\
                "quantity" : 1\
            }\
        ]
    }
}
```

> Sample PHP Request

```php
$data = array(
    "order" => array(
        "user_order_detail" => array(
            array(
                "event_id": 5,
                "product_id": 2,
                "product_price" : 5,
                "product_vat" : 0,
                "quantity" : 1
            )
        )
    )
);
$order_uuid = 'f091c0fa-7a92-4a5e-97a7-0e0d091fbadf';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/cart/'.$order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

The response will contain the updated order cart details.

> Sample Response

```json
[\
    {\
        "detail inserted": "order",\
        "action": "add",\
        "inserted": {\
            "client_event_id": 5,\
            "client_product_id": 1,\
            "user_order_detail_amount": 1,\
            "user_order_id": "6689",\
            "client_event_name": "Race Day",\
            "client_event_date": "2024-03-31 00:00:00",\
            "client_product_name": "Adult Ticket",\
            "order_detail_id": 3047,\
            "ticket_inserted": [\
                {\
                    "ticket_uuid": "2cccd546-1234-1234-abc-d60429a8f0b1",\
                    "barcode_ean13": "1234567891234"\
                }\
            ]\
        },\
        "ticket_count": 1\
    },\
    {\
        "add": "order",\
        "id": "6689",\
        "order_uuid": "6c39a3d3-413d-4f78-9fe3-f77d13622370",\
        "order_token": "KRLXIM2XKZFE2UJTIJVFMMCSJJHFOZZRKZWVEM2VGJHHGVKIJYYWCSDEIJSVO6CDMRCXQSKOGFMTAUZQKZBVK2SWOFSUK5CUMMZWQUKUGBNHCVSYMN3VORJZNFFTGRTPMVXE4WK2NRBGSTSGJZEVSMTQGJLDERTLKEZWYMLDNNVXSZLNLJZWKR2NGRGXUWSOK5XFE4C2NVFDGYT2KZLFKRCWMFRVO43SMNCUUQS2NU4U6YJSJZJGGVKSOFGUQ2DZJZWGIWTCNJSHSTT2MM6Q%3D%3D%3D%3D"\
    }\
]
```

### Cart Edit _(PATCH)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/cart/:order\_uuid](https://external.futureticketing.ie/v1/private/order/cart/:order_uuid)_

This endpoint facilitates updating the quantity of products in the user’s order cart, including both order details and
tickets.

The request body should be in JSON format and include the following parameters:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| id | Order Detail ID | int | true |
| event\_id | Event ID | int | true |
| product\_id | Product ID | int | true |
| quantity | Quantity of the Product being purchased | int | true |

The request body should be in JSON format and include the following parameters:

> Sample Request Body

```json
{
"order": {
      "user_order_detail": [\
          {\
              "id": 3044,\
              "event_id": 5,\
              "product_id": 1,\
              "quantity": 1\
          }\
      ]
}
}
```

> Sample PHP Request

```php
$data = array(
    "order" => array(
        "user_order_detail" => array(
            array(
                "id" => 3044,
                "event_id" => 5,
                "product_id" => 1,
                "quantity" => 1
            )
        )
    )
);
$order_uuid = 'f091c0fa-7a92-4a5e-97a7-0e0d091fbadf';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/cart/'.$order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

The response will contain the updated order cart details.

> Sample Response

```json
[\
    {\
        "ticket updated": "order",\
        "action": "edit",\
        "ticket_removed": [\
            "2041",\
            "2040"\
        ],\
        "ticket_removed_count": 2\
    },\
    {\
        "edit": "order",\
        "id": "6688",\
        "order_uuid": "f091c0fa-7a92-4a5e-97a7-0e0d091fbadf",\
        "order_token": "KRLXIM2XKZFE2UJTIJVFMMCSJJHFOZZRKZWVEM2VGJHHGURRLJUWC3DMOBNDEZDLLFWVS6CWIVNGCZKGJZJFIMCWMFQW2MLMLJWUU6KTIUYVEVJRMRFVS3CGKZMTEVSDKFLFU4LCKVNFMTKXGVJGGMBZJBJUK53SJVMFM3LBNV4HCZCHORJU2WCCJBHFMQTKKZLVC6DCKVLEQT2INBMVCV3EPJFTA2CCKN4TS3CNGNLFEY2YOBKVM6SSLJLFI2CDK5DFMVCRKRDHCYSVKU6Q%3D%3D%3D%3D"\
    }\
]
```

### Cart Delete _(DELETE)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/cart/:order\_uuid](https://external.futureticketing.ie/v1/private/order/cart/:order_uuid)_

This endpoint is used to remove a specific user order detail from the cart.

The request body should be in JSON format and include the following parameters:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| id | Order Detail ID | int | true |

The request body should be in JSON format and include the following parameters:

> Sample Request Body

```json
{
    "order": {
        "user_order_detail": [\
            {\
                "id": 3047\
            }\
        ]
    }
}
```

> Sample PHP Request

```php
$data = array(
    "order" => array(
        "user_order_detail" => array(
            array(
                "id" => 3047
            )
        )
    )
);
$order_uuid = 'f091c0fa-7a92-4a5e-97a7-0e0d091fbadf';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/cart/'.$order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

The response will contain the updated order cart details.

> Sample Response

```json
[\
    {\
        "detail deleted": "order",\
        "action": "delete",\
        "received": {\
            "user_order_detail_id": 3047\
        }\
    },\
    {\
        "add": "order",\
        "id": "6689",\
        "order_uuid": "6c39a3d3-413d-4f78-9fe3-f77d13622370",\
        "order_token": "KRLXIM2XKZFE2UJTIJVFMMCSJJHFOZZRKZWVEM2VGJHHGVKIJYYWCSDEIJSVO6CDMRCXQSKOGFMTAUZQKZBVK2SWOFSUK5CUMMZWQUKUGBNHCVSYMN3VORJZNFFTGRTPMVXE4WK2NRBGSTSGJZEVSMTQGJLDERTLKEZWYMLDNNVXSZLNLJZWKR2NGRGXUWSOK5XFE4C2NVFDGYT2KZLFKRCWMFRVO43SMNCUUQS2NU4U6YJSJZJGGVKSOFGUQ2DZJZWGIWTCNJSHSTT2MM6Q%3D%3D%3D%3D"\
    }\
]
```

### Update Payment Status _(POST)_

To update the Payment Status of an Order when it has been fully paid, cancelled, refunded etc you would call this
end point passing in an array of the required details.

If your order contains seats, and you are not using FT Payments as your payment type, or if your order total amount is
0,
you will need to pass “bookseat:true” and also pass “seat\_reservation\_token” in the payload to ensure seats are booked.

**Rewards4Racing**

Guidance on implementing Rewards4Racing loyalty programme can be found [here](https://external.futureticketing.ie/v1/howto#rewards4racing)\*\*.

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **status\_id** | The [Order Status](https://external.futureticketing.ie/#status-tables-order-status) to update the Order to | int | true |
| **payment\_method\_id** | The [Payment Method](https://external.futureticketing.ie/#status-tables-payment-provider) for this order | int | true |
| **payment\_provider** | Text version of the Payment Provider | string | true |
| **payment\_result** | Result from the payment provider | string | true |
| **seat\_reservation\_token** | Reservation Token to use if attempting to fully book reserved seats. Seats will only be Booked when Status ID 4 (Payment Accepted) is sent | string | false |
| **send\_email** | To have the system send the customer an email receipt set this value to 1. Default is not to send email. | int | false |
| **send\_eticket** | Default is to attach an eticket to email if products or events are set to do so. To prevent the system from attaching etickets set this value to 0. | int | false |
| **paymentintent** | For detailed information on how to use and implement Stripe Payment Intent, please visit the following link: [Stripe Payment Intent Guide](https://external.futureticketing.ie/v1/howto#shopping-cart-checkout-payments) | int | false |
| **paymentintent\_method** | For detailed information on how to use and implement Stripe Payment Intent, please visit the following link: [Stripe Payment Intent Guide](https://external.futureticketing.ie/v1/howto#shopping-cart-checkout-payments) | array | false |
| **bookseat** | Pass “true” for bookseat if you are attempting to book seat(s) with a 0 amount order, or if you are NOT using FT Payments as payment method. | string | false |
| **payment\_request** | Used to process [alternative Payment Gateways](https://external.futureticketing.ie/v1/howto#payment-processing-supported-gateways-and-integration-types) like eComm365, Buckaroo, etc. Pass 1 to begin the payment process. | int | false |
| **payment\_request\_options** | Send additional parameters to choose and setup specific Payment Request [Integration Types](https://external.futureticketing.ie/v1/howto#payment-processing-supported-gateways-and-integration-types) | array | false |
| **previous\_order\_id** | Links the current order to a previous one (e.g., during upgrade or replacement). The previous order is set to status 29 (Order Updated) and connected to the new order. | int | false |

> Sample Payment Status Update request

````json
JSON
$json = {
            "order" :[\
                    {\
                        "status_id" : 7,\
                        "payment_method_id" : 1,\
                        "payment_provider" : 'Cash',\
                        "payment_result" : 'XKJZE2SD12312', //Transaction ID to reference payment\
                        "send_email" : 1,\
                        "send_eticket" : 0\
                    }\
                ]
        }
``` php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/updatepaymentstatus/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$result = curl_exec($ch);
````

Important: The seat\_reservation\_token is essential for managing seat reservations and must be provided when finalising
seat bookings. Reserved seats will only be confirmed and transitioned to “Booked” status when both of the following
conditions are met:

- The correct reservation token is supplied.
- The status\_id is set to 4, indicating that payment has been accepted.

If these conditions are not met, the seat reservations will not be finalised and will be released once the holding
period expires.

> Sample Payment Status Update request with Seat Booking

````json
JSON
$json = '{"order" :[\
            {\
                "status_id" : 4,\
                "seat_reservation_token" : "f5786c28-6f55-11e6-8b77-86f30ca893d3",\
                "payment_method_id" : 1,\
                "payment_provider" : "Cash",\
                "payment_result" : "XKJZE2SD12312", //Transaction ID to reference payment\
                "send_email" : 1,\
                "send_eticket" : 0\
            }\
        ]
    }';
``` php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/updatepaymentstatus/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
````

#### Response

The request will respond with a JSON string that will include order ID and list out the ticket details for the order.

> Sample Payment Status Update response

```json
{
    "updated": "order",
    "id": "21579",
    "ticket": [{\
            "barcode_ean13": "461100156550",\
            "scans_available": "1",\
            "event_id": "1956",\
            "event_name": "",\
            "product_id": "1035",\
            "product_name": "",\
            "send_eticket": "1"\
        }, {\
            "barcode_ean13": "461110164260",\
            "scans_available": "1",\
            "event_id": "1956",\
            "event_name": "",\
            "product_id": "1035",\
            "product_name": "",\
            "send_eticket": "0"\
        }, {\
            "barcode_ean13": "461110168530",\
            "scans_available": "1",\
            "event_id": "1956",\
            "event_name": "",\
            "product_id": "1035",\
            "product_name": "",\
            "send_eticket": "1"\
        }\
    ]
}
```

### Payment Request Check (POST)

Use this endpoint to check if the payment has been processed or not. Possible payment results are:

- pending
- accepted
- declined

> Sample Payment Check Request

```php
$payment_id = '2048';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/payment/check'.$payment_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
$result = curl_exec($ch);
```

> Sample Payment Check Response

```json
{
    "payment_result": "pending", // May be "pending", "accepted" or "declined"
    "payment_data": {
        "payment_id": "2048",
        "payment_uuid": "ff635b70-e0e8-4908-8703-bf8d384334be",
        "payment_status": "0",
        "order_id": "1024",
        "order_status": "2"
    }
}
```

### Check Order Payment Status (POST)

This endpoint provides real-time information on the status of an order for purposes such as guiding end users
completeing a purchase.

> Sample Check Order Payment Status request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/payment/check-order-status/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The most important value in the response is “fulfilled”. Only a value of “true” indicates a sucessful payment.
The “data” field provides order data.

> Sample Check Order Payment Status response

```json
{
"fulfilled": true,
"data": {
    "id": "1234",
    "account_id": "567",
    "company": null,
    "company_id": "1",
    "previous_id": null,
    "user_order_uuid": "451c10yr-dde2-4aff-9ea2-e6a04juf5a",
    "external_code": null,
    "user_id": "0",
    "payment_id": "21360628103459",
    "status_id": "13",
    "order_amount": "30.00",
    "order_date_time": "2023-06-28 10:00:00",
    "order_email": "support@futureticketing.com",
    "order_company": null,
    "order_title": null,
    "first_name": "",
    "second_name": "",
    "address1": "",
    "address2": "",
    "address3": null,
    "address4": null,
    "address5": null,
    "address6": null,
    "county": null,
    "postcode": null,
    "country_id": "1",
    "phone": null,
    "payment_method_id": "24",
    "payment_provider": null,
    "payment_result": null,
    "payment_extra": null,
    "accept_terms": "0",
    "accept_moreinfo": "0",
    "accept_moreinfo2": "0",
    "show_price": "1",
    "currency": "STG",
    "delivery_id": "2",
    "site_id": null,
    "redemption_id": null,
    "sales_channel_id": "4",
    "venue_id": "1",
    "edited_date": null,
    "legacy_id": null,
    "user_order_status_paid_type": "3",
    "client_charge_eticket": "1"
}
}
```

### Add Order Comment _(POST)_

_Endpoint: [https://external.futureticketing.ie/v1/private/order/comment/add](https://external.futureticketing.ie/v1/private/order/comment/add)_

To add a comment to an existing order in your database you can use this endpoint. The comment will be stored with the
order and can be used for tracking order updates or customer service notes.

#### Arguments

The request body should be in JSON format and include the following parameters:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **order\_id** | The ID of the order to add the comment to | int | true |
| **comment** | The comment text to add (max 1000 characters) | string | true |
| **user\_id** | Optional ID of the user adding the comment | int | false |

> Sample Add Comment request

```php
$data = array(
    "order_id" => 123,
    "comment" => "Customer requested refund",
    "user_id" => 1  // Optional
);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/comment/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string indicating success or failure.

> Sample Success Response

```json
{
    "success": true,
    "message": "Comment added successfully under Order ID: 123"
}
```

> Sample Error Response

```json
{
    "error": "400",
    "message": "Order ID and Comment are mandatory"
}
```

#### Error Codes

| Status Code | Description |
| --- | --- |
| 400 | Bad Request - Missing required fields or comment exceeds maximum length |
| 403 | Unauthorized - Invalid or missing authentication |
| 404 | Not Found - Order ID does not exist |
| 500 | Internal Server Error - Failed to add comment |

### Get Extra Fields _(Get)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/extrafields](https://external.futureticketing.ie/v1/private/order/extrafields)_

To get the extra fields available for an order you can use this endpoint.
To get the list of extra fields for an Order to the system you will need to perform a **GET** request passing the Order
ID in the URL.

> Request sample

```
$order_id = 1;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/extrafields/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, GET);
$result = curl_exec($ch);
```

If the order itself or tickets on it has extra fields available, a JSON response with a list of fields available for
the ‘order’ or ‘tickets’ will be contained on key ‘extra\_fields’. For tickets, the UUID is included as a key of each
item which will need append on the call to save the extra fields.

> Response Sample

```
{
    "code": 200,
    "order": {
        "extra_fields": [\
            {\
                "name": "radiobutton",\
                "label": "Radio Button",\
                "type": "radio",\
                "required": "false",\
                "values": [\
                    {\
                        "label": "Value 1",\
                        "value": "value_1"\
                    },\
                    {\
                        "label": "Value 2",\
                        "value": "value_2"\
                    }\
                ]\
            }\
        ]
    },
    "tickets": {
        "a5086642-d86a-40a2-a850-6a422692fa7c": {
            "product": {
                "name": "Adult"
            },
            "extra_fields": [\
                {\
                    "name": "text",\
                    "label": "text",\
                    "type": "text",\
                    "required": "true"\
                },\
                {\
                    "name": "dropdown",\
                    "label": "dropdown",\
                    "type": "dropdown",\
                    "required": "true",\
                    "values": [\
                        {\
                            "label": "Value 1",\
                            "value": "value_1"\
                        },\
                        {\
                            "label": "Value 2",\
                            "value": "value_2"\
                        },\
                        {\
                            "label": "value_3",\
                            "value": "value_3"\
                        }\
                    ]\
                }\
            ]
        },
        "ef661188-a6a1-44ce-8824-f5accb943101": {
            "product": {
                "name": "Adult"
            },
            "extra_fields": [\
                {\
                    "name": "text",\
                    "label": "text",\
                    "type": "text",\
                    "required": "true"\
                },\
                {\
                    "name": "dropdown",\
                    "label": "dropdown",\
                    "type": "dropdown",\
                    "required": "true",\
                    "values": [\
                        {\
                            "label": "Value 1",\
                            "value": "value_1"\
                        },\
                        {\
                            "label": "Value 2",\
                            "value": "value_2"\
                        },\
                        {\
                            "label": "value_3",\
                            "value": "value_3"\
                        }\
                    ]\
                }\
            ]
        },
        "92d93cb0-f5ac-45f6-801e-0f0f8566cc00": {
            "product": {
                "name": "Adult"
            },
            "extra_fields": [\
                {\
                    "name": "text",\
                    "label": "text",\
                    "type": "text",\
                    "required": "true"\
                },\
                {\
                    "name": "dropdown",\
                    "label": "dropdown",\
                    "type": "dropdown",\
                    "required": "true",\
                    "values": [\
                        {\
                            "label": "Value 1",\
                            "value": "value_1"\
                        },\
                        {\
                            "label": "Value 2",\
                            "value": "value_2"\
                        },\
                        {\
                            "label": "value_3",\
                            "value": "value_3"\
                        }\
                    ]\
                }\
            ]
        }
    }
}
```

Extra fields properties

| Name | Description |
| --- | --- |
| **name** | The database name of field |
| **label** | The text to be display to the customer |
| **type** | The [Extra Field Type](https://external.futureticketing.ie/#status-tables-extra-field-type) |
| **required** | When the field is require, the value is return as ‘true’ otherwise ‘false’ |
| **values** | It is an optional property that will containt any values configurated for the field on the dashboard. |

### Add/Update Extra Field _(PUT)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/extrafields](https://external.futureticketing.ie/v1/private/order/extrafields)_

To Add or Update the fields available for an order you can use this endpoint.
You will need to perform a **PUT** request passing the Order ID in the URL and the values to be save on the body as
JSON.

> Body structure

```
{
    "order": {
        "field_name": "value"
    },
    "tickets": {
        "ticket1_uuid": {
            "field_name1": "value",
            "field_name2": "value"
        },
        "ticket2_uuid": {
            "field_name1": "value",
            "field_name2": "value"
        }
    }
}
```

_Note:_ Non-required fields do not need to be included in the body call.

> Request sample

```
$order_id = 1;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/extrafields/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, PUT);
curl_setopt($ch, CURLOPT_POSTFIELDS, '{
    "tickets": {
        "a5086642-d86a-40a2-a850-6a422692fa7c": {
            "text": "example",
            "dropdown": "value_1"
        },
        "ef661188-a6a1-44ce-8824-f5accb943101": {
            "text": "example",
            "dropdown": "value_1"
        },
        "92d93cb0-f5ac-45f6-801e-0f0f8566cc00": {
            "text": "example",
            "dropdown": "value_1"
        }
    }
}');
$result = curl_exec($ch);
```

> Successful request sample

```
{
    "code": 201,
    "message": "Extra field saved"
}
```

### Add Voucher _(POST)_

To add a Voucher for the order you will need to perform a **POST** request passing an user order uuid
to the end point.

> Sample Add Voucher request

```php
$data = array(
    "vouchercode" => $_REQUEST["vcode"],
    "event_id" => $_REQUEST["event_id"]
);
$user_order_uuid = $_REQUEST['user_order_uuid'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/vouchercode/add/'.$user_order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, POST);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Add Voucher Response

```json
{
    [\
        {\
            "add": "voucher",\
            "id": 254951,\
            "order_id": "73605",\
            "order_uuid": "f2613287-a36e-4fbb-b6ba-631adf4fc330",\
            "price_discount_applied": "-5.00",\
            "vat_discount_applied": "0.00"\
        }\
    ]
}
```

### Remove Voucher _(DELETE)_

To remove a Voucher for the order you will need to perform a **DELETE** request passing a user order uuid to the
endpoint and vouchercode on the body.

> Sample Remove Voucher Request

```php
$data = array(
    "vouchercode" => 'CODE',
);
$user_order_uuid = '123abcde-abcd-12abc-abcd-d7b015228cfc';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/vouchercode/remove/'.$user_order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Remove Voucher Response

```json
{
    "code": 200,
    "message": "Voucher(s) Removed",
    "vouchers": [\
        {\
            "action": "removed",\
            "id": "22",\
            "vouchercode": "CODE",\
            "price_discount_removed": "-20.00",\
            "vat_discount_removed": "0.00"\
        }\
    ]
}
```

### Add Voucher Card _(POST)_

_Do not confuse Voucher Cards with Vouchers._

_Voucher Cards can be understood as similar to Gift Cards._ _Vouchers can be understood as similar to Discount Codes._

To add a Voucher Card for the order you will need to perform a **POST** request passing an user order uuid
to the end point URL and the voucher card code on the body.

If the Voucher Card cannot be found or doesn’t have any balance available, a 400/404 status code will be returned.

> Sample Add Voucher request

```php
$data = array(
    "vouchercard" => "1234-5678-9012-3456",
);
$user_order_uuid = "640d11c4-ed89-4beb-aa69-3bae3dd04b8b";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/vouchercard/add/'.$user_order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, POST);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Add Voucher Card Response

```json
{
    "code": 200,
    "message": "Voucher Card Added",
    "voucher_card": {
        "action": "added",
        "id": "128",
        "voucher_card_code": "1234-5678-9012-3456",
        "amount_available": 0,
        "amount_used": 20
    },
    "order": {
        "order_id": "1024",
        "order_uuid": "640d11c4-ed89-4beb-aa69-3bae3dd04b8b",
        "amount_left_to_be_paid": 80
    }
}
```

### Remove Voucher Card _(DELETE)_

To remove a Voucher Card from the order you will need to perform a **DELETE** request passing a user order uuid to the
endpoint URL and the voucher card code on the body.

If the Voucher Card cannot be found or hasn’t been applied to the requested order, a 400/404 status code will be
returned.

> Sample Remove Voucher Card Request

```php
$data = array(
    "vouchercard" => "1234-5678-9012-3456",
);
$user_order_uuid = "640d11c4-ed89-4beb-aa69-3bae3dd04b8b";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/vouchercard/remove/'.$user_order_uuid);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Remove Voucher Card Response

```json
{
    "code": 200,
    "message": "Voucher Card Removed",
    "voucher_card": {
        "action": "removed",
        "id": "128",
        "voucher_card_code": "1234-5678-9012-3456",
        "amount_available": 20,
        "amount_restored": 20
    },
    "order": {
        "order_id": "1024",
        "order_uuid": "640d11c4-ed89-4beb-aa69-3bae3dd04b8b",
        "amount_left_to_be_paid": 100
    }
}
```

### Cancel Ticket _(PUT)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/cancelticket](https://external.futureticketing.ie/v1/private/order/cancelticket)_

To cancel a ticket from the order you can use this endpoint.
You will need to perform a **PUT** request and passing the order and ticket details on the body as JSON.

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **order\_id** | The order ID of the ticket | int | true |
| **barcode** | The EAN13 barcode of the ticket | int | true |
| **reason** | A short explanation for the canceling | string | false |

> Request sample

```
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/cancelticket);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, PUT);
curl_setopt($ch, CURLOPT_POSTFIELDS, '{
"order_id":"15",
"barcode":"347845810060",
"reason":"No available"
}');
$result = curl_exec($ch);
```

> Successful request sample

```
{
    "code": 200,
    "message": "Ticket has been canceled"
}
```

## Order Search

### Search

_Endpoint : [https://external.futureticketing.ie/v1/private/order/search](https://external.futureticketing.ie/v1/private/order/search)_

To get a listing of current Orders in your database you can use this as your starting point.
The Orders are returned sorted by Order ID with the oldest Orders appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/order/search/page/limit/order](https://external.futureticketing.ie/v1/private/order/search/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/order/search/1/20/datetime](https://external.futureticketing.ie/v1/private/order/search/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the order attributes)_ | string |

> Sample paging request

```
https://external.futureticketing.ie/v1/private/order/search/event/1/{page}/{limit}/{order}
```

#### Response

All the below Search requests will respond with a JSON string that will list out the attributes of the Order(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Orders found to be used for paging.

> Sample Order List response

```json
{
    "data" : [{\
            "id" : "1",\
            "account_uuid": "ca79e673-52cd-4cb9-ab87-2fd145836c22",\
            "status" : "Email Sent",\
            "order_date" : "2018-03-05 13:23:15",\
            "email" : "joebloggs@futureticketing.ie",\
            "order_amount" : "55.50",\
            "title" : "Mr",\
            "first_name" : "Joe",\
            "second_name" : "Bloggs",\
            "address1" : "No 24",\
            "address2" : "The Grove",\
            "address3" : "Housing Estate",\
            "address4" : "",\
            "address5" : "",\
            "address6" : "",\
            "county" : "Dublin",\
            "postcode" : "",\
            "country" : "Ireland",\
            "phone" : "01 123 4567",\
            "payment_type" : "Credit Card",\
            "terms_accepted" : "1",\
            "more_info" : "1",\
            "more_info2" : "0",\
            "comment" : "Order made succesfully and email sent",\
            "detail" : [{\
                    "id" : "223",\
                    "parent_id" : null,\
                    "product_type" : "1",\
                    "event_id" : "1",\
                    "event" : "Test Event",\
                    "event_date" : "2018-04-25 00:00:00",\
                    "product_id" : "1",\
                    "product" : "Test Product",\
                    "quantity" : "1",\
                    "product_price" : "5.50",\
                    "product_vat" : "0.00",\
                    "redeemed" : 0,\
                    "suggested" : 0,\
                    "send_eticket": "1",\
                    "barcode" : [{\
                        "id": "234561",\
                        "uuid": null,\
                        "barcode_ean13": "3467234571403",\
                        "barcode_external": null,\
                        "scan_datetime": null,\
                        "scan_detail": null,\
                        "scanner_no": null,\
                        "allow_entry": "1",\
                        "ticket_valid": "1",\
                        "scans_available": "1",\
                        "ticket_cancelled": "0",\
                        "account_transferred": null,\
                        "seat" : null\
                    }, {\
                        "id": "234563",\
                        "uuid": null,\
                        "barcode_ean13": "3467542645708",\
                        "barcode_external": null,\
                        "scan_datetime": null,\
                        "scan_detail": null,\
                        "scanner_no": null,\
                        "allow_entry": "1",\
                        "ticket_valid": "1",\
                        "scans_available": "1",\
                        "ticket_cancelled": "0",\
                        "account_transferred": null,\
                        "seat" : "Block A Row B Seat 2"\
                    }]\
                }, {\
                    "id" : "224",\
                    "parent_id" : null,\
                    "product_type" : "1",\
                    "event_id" : "1",\
                    "event" : "Test Event",\
                    "event_date" : "2018-04-25 00:00:00",\
                    "product_id" : "2",\
                    "product" : "Test Product 2",\
                    "quantity" : "2",\
                    "product_price" : "25.00",\
                    "product_vat" : "0.00",\
                    "redeemed" : 1,\
                    "suggested" : 0,\
                    "send_eticket": "1"\
                }\
            ],\
            "extra_field" : [{\
                "order_detail_id" : "223",\
                "barcode" : "3467234571403",\
                "barcode_external" : "",\
                "extra_field_id" : "1",\
                "extra_field_name" : "Date of Birth",\
                "value" : "10/06/1982"\
            },{\
                "order_detail_id" : "224",\
                "barcode" : "3467234571403",\
                "barcode_external" : "",\
                "extra_field_id" : "2",\
                "extra_field_name" : "Membership Card Name",\
                "value" : "Joe Bloggs"\
            }]\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "145"
}
```

### Search _(POST)_

To perform a search of orders with optional search parameters the /search post method can be used. It will return JSON
details as above. All fields are optional and any combination of fields can be sent to perform a search.

| Field | Description | Type |
| --- | --- | --- |
| order\_id | Order ID | int |
| order\_uuid | Order Universally unique identifier | string |
| email | Email address used for the order | string |
| account\_id | Account ID stored against the order | int |
| first\_name | First Name stored for the order | string |
| second\_name | Second Name stored for the order | string |
| company | Company Name stored for the order | string |
| start\_date | Start Date of Order. Dates should be sent in YYYY-MM-DD format | date |
| end\_date | Start Date of Order. Dates should be sent in YYYY-MM-DD format | date |
| updated\_since | Find any Orders updated after this date. Dates should be sent in YYYY-MM-DD format | date |
| local\_date | Use the client specific timezone while searching by dates | boolean |
| order\_status\_id | The Order Status ID to search for | int / Array of int |
| valid\_order | Only return Orders that are active / paid | int _(send as 1)_ |
| barcode | Barcode number of ticket in an order | string |
| external\_barcode | 3rd Party Barcode number of ticket in an order | string |
| external\_code | 3rd Party Order number | string |
| event\_id | ID of the Event to search for | int |
| product\_category\_id | ID of the Product Category to search for | int |
| paynow\_token | Provide order\_token or ft\_pn parameter on order\_token\_url or order\_paynow\_url provided on Add Order endpoint. | string |
| expand | Allows to obtain additional details for the items on the expandable options list. | Array of string |

**Expandable options available**

| Name | Description |
| --- | --- |
| order\_payment | Return list of payment details for the order |
| order\_balance | Return the paid and the remaining balance amount for the order |
| organiser | Return events with the organiser details included. |

> Sample Order ID Search request

```php
$data = array(
    "order_id" => $_POST['order_id'],
    "email" => $_POST['email'],
    "first_name" => $_POST['first_name'],
    "second_name" => $_POST['second_name'],
    "company" => $_POST['company'],
    "start_date" => $_POST['start_date'],
    "end_date" => $_POST['end_date'],
    "barcode" => $_POST['barcode'],
    "external_barcode" => $_POST['external_barcode'],
    "external_code" => $_POST['external_code'],
    "product_category_id" => $_POST['product_category_id'],
    "expand": ["order_payment"]
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

### Search/ID _(GET)_

To perform a search of orders with a specific order id use this endpoint. It will return JSON details as above.

> Sample Order ID Search request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/id/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

### Search/Email _(GET)_

To perform a search of all orders with a specific email address use this endpoint. It will return JSON details as above.

> Sample Order Email Search request

```php
$email_search = $_POST['email_search'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/email/'. $email_search);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

### Search/Event _(GET)_

To perform a search of all orders with a specific Event in the order use this endpoint. It will return JSON details as
above.

> Sample Order Event Search request

```php
$event_id = $_POST['event_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/event/'. $event_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

### Search/Product _(GET)_

To perform a search of all orders with a specific Product in the order use this endpoint. It will return JSON details as
above.

> Sample Order Event Search request

```php
$product_id = $_POST['product_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/product/'. $product_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

### Search/Date _(GET)_

To perform a search of all orders between 2 dates use this endpoint. Dates should be sent in YYYY-MM-DD format.
It will return JSON details as above.

> Sample Order Event Search request

```php
$start_date = $_POST['start_date'];
$end_date = $_POST['end_date'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/date/'. $start_date .'/'. $end_date);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

### Search/Summary _(POST)_

To perform a search of Orders and receive a summary of the Order this end point can be used.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **order\_uuid** | Order UUID | string | false |
| **order\_id** | Order ID | int | false |
| email | Email | string | false |
| barcode | Barcode | string | false |
| delivery\_method | Allows filtering of Orders by Delivery Method(s) | Array of int | false |
| ignore\_product | Allows filtering of Orders/Tickets by Product ID to not return. | Array of int | false |

> Sample Order Summary Search request

```php
$data = array(
    "id" => 12345,
    "ignore_product": [12]
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/search/summary');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the attributes of the Order
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Orders found to be used for paging.

> Sample response

```json
{
    "data": [\
        {\
            "id": "12345",\
            "order_uuid": "3asdac7b-a4f9-4bcf-8a85-42ee5d20be5a",\
            "account_uuid": "b3de43a8-e48a-40c6-963c-f3a2sd3s3ac2",\
            "external_code": null,\
            "status": "Email Sent",\
            "order_date": "2023-07-26 12:02:24",\
            "order_email": "test@tet.com",\
            "order_amount": "24.60",\
            "title": null,\
            "first_name": "Test",\
            "second_name": "Name",\
            "venue_name": "Test Venue",\
            "detail": [\
                {\
                    "id": "7384",\
                    "event": "Test Event",\
                    "event_date": "2023-07-31 00:00:00",\
                    "event_name_live": "Test Event",\
                    "event_date_live": "2023-10-31 00:00:00",\
                    "product_type_name": "Child",\
                    "product_area_name": "East Stand",\
                    "product_category_name": "Lower",\
                    "quantity": 1,\
                    "barcode": [\
                        {\
                            "barcode_ean13": "7312674946004",\
                            "barcode_external": "FT010000007901012040173846123",\
                            "seat": "Stand 2-D-5",\
                            "counter": "1 of 1"\
                        }\
                    ]\
                }\
            ],\
            "ticket_count": 1\
        }\
    ],
    "currentpage": 1,
    "limit": 20,
    "total": "1"
}
```

## Customer Account

_Endpoint : [https://external.futureticketing.ie/v1/private/account](https://external.futureticketing.ie/v1/private/account)_

This is the main private end point for interacting with a Customer Account object on your Future Ticketing account. Any
interaction available with the Account will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Account ID | int | true |
| external\_id | External Account Code | string | false |
| uuid | Account UUID | string | true |
| email | Email | string | true |
| password | Password | string | true |
| title | Title | string | false |
| first\_name | First Name | string | false |
| second\_name | Seconda Name | String | true |
| more\_info | More Information | boolean | false |
| more\_info2 | Second More Information | boolean | false |
| archived | Archived Account | boolean | false |

### List _(GET)_

To get a listing of current Accounts in your database you can use this end point.
The Accounts are returned sorted by Account ID with the oldest Account appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Account List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/account/page/limit/order](https://external.futureticketing.ie/v1/private/account/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/account/1/20/datetime](https://external.futureticketing.ie/v1/private/account/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Accounts(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Accounts found to be used for paging.

> Sample Account List response

```json
{
    "data" : [{\
            "id" : "1",\
            "external_id" : null,\
            "uuid" : "9999f9a3-b277-4e10-9af6-31529ffa7acb",\
            "email" : "test@test.com",\
            "password" : "2c97a9e8b7fcf1431150718a5187299dea0799d4",\
            "title" : "Mr",\
            "first_name" : "Joe",\
            "second_name" : "Bloggs",\
            "more_info" : 1,\
            "more_info2" : 0,\
            "added" : "2020-01-01 15:00:00",\
            "archived" : 0\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### List _(POST)_

To get a listing of current Accounts in a **date range** in your database you can use this end point.
The Accounts are returned sorted by Account ID with the oldest Account appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

| Field | Description | Type |
| --- | --- | --- |
| start\_date | Start Date of Account being added. Dates should be sent in YYYY-MM-DD format | date |
| end\_date | End Date of Account being added. Dates should be sent in YYYY-MM-DD format | date |
| first\_name | First Name stored for the Account | string |
| second\_name | Second Name stored for the Account | string |
| email | Email stored for the Account | string |
| postcode | Postcode stored for the Account | string |
| active | Active / Non-Active accounts. Send as “Yes” / “No” | string |
| updated\_since | Find any Account updated after this date. Dates should be sent in YYYY-MM-DD format | date |
| expand | Allows to obtain additional details for the items on the expandable options list. | Array of string |

**Expandable options available**

| Name | Description |
| --- | --- |
| account\_category | The Categories linked to the account |
| address | The Address linked to the account |
| company | Any Companies linked to the account |
| extra\_field | Any Extra Fields linked to the account |
| voucher\_card | Any Voucher Cards linked to the account |
| age | Include account holder’s age if date of birth is available |
| sales\_summary | Return Sales Summary data for the account |

> Sample Accounts List Post request

```php
$data = array(
    "start_date" => date('Y-m-d H:i', strtotime('-1 month')), //2016-11-24 13:00
    "end_date" => date('Y-m-d H:i', strtotime('+1 month')) //2017-01-16 13:00,
    "expand": ["account_category"]
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/account/page/limit/order](https://external.futureticketing.ie/v1/private/account/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/account/1/20/datetime](https://external.futureticketing.ie/v1/private/account/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Accounts(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Accounts found to be used for paging.

> Sample Account List response

```json
{
    "data" : [{\
            "id" : "1",\
            "external_id" : null,\
            "uuid" : "9999f9a3-b277-4e10-9af6-31529ffa7acb",\
            "email" : "test@test.com",\
            "password" : "2c97a9e8b7fcf1431150718a5187299dea0799d4",\
            "title" : "Mr",\
            "first_name" : "Joe",\
            "second_name" : "Bloggs",\
            "more_info" : 1,\
            "more_info2" : 0,\
            "added" : "2020-01-01 15:00:00",\
            "archived" : 0\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Accounts in your database you can use this end point.
A search is performed on the ‘event\_id’ field with the information sent via the URL.

> Sample Accounts GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Account GET response

```json
{
    "data" : [{\
            "id" : "1",\
            "external_id" : null,\
            "uuid" : "9999f9a3-b277-4e10-9af6-31529ffa7acb",\
            "email" : "test@test.com",\
            "password" : "2c97a9e8b7fcf1431150718a5187299dea0799d4",\
            "title" : "Mr",\
            "first_name" : "Joe",\
            "second_name" : "Bloggs",\
            "more_info" : 1,\
            "more_info2" : 0,\
            "added" : "2020-01-01 15:00:00",\
            "archived" : 0\
        }\
    ]
}
```

### Add _(POST)_

To add a new Account to the system you will need to perform a **POST** request passing an array
of Account objects to the main Account end point.

> Sample Account Add request

```json
JSON
$json = '{"account" :[\
            {\
                "external_id" : "customid_1",\
                "email" : "testing@test.com",\
                "password" : "plaintext",\
                "title" : "Mr",\
                "first_name" : "Jimmy",\
                "second_name" : "Magee",\
                "more_info" : 1,\
                "more_info2" : 0\
            }\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Account Add response

```json
{
    [\
        "added" : "account",\
        "email" : "testing@test.com",\
        "id" : 2,\
        "internal_id" : "Internal Code from ePos",\
        "uuid" : "df26d930-2516-4d2b-beff-3cdc4d9329e3",\
        "added" : "2020-04-24 18:07:29"\
    ]
}
```

### Update Account _(PUT)_

To Update Customer account you will need to do a **PUT** request passing in the Customer ID to the endpoint

> Sample Update Account request

```php
$data = array(
    "email" => "test@test.com",
    "first_name" => "Joe",
    "second_name" => "Bloggs"
);
$customer_id = $_POST['customer_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/update/'.$customer_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, PUT);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Update Account Response

```json
{
    "data": [\
        {\
            "updated": "account",\
            "id": "501"\
        }\
    ]
}
```

### Add Address _(POST)_

_Endpoint: [https://external.futureticketing.ie/v1/private/account/{account\_id}/address/add](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address/add)_

This endpoint allows you to add a new address to a customer account. The address details are passed in the request body as JSON.

#### Arguments

Values should be passed in the URL:
_[https://external.futureticketing.ie/v1/private/account/{account\_id}/address/add](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address/add)_

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **account\_id** | The ID of the account to add address to | int | true |

#### Request Body Parameters

The request body should be in JSON format and include the following parameters within an “accountaddress” array:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| name | Name for this address | string | false |
| address1 | Address line 1 | string | true |
| address2 | Address line 2 | string | false |
| address3 | Address line 3 | string | false |
| address4 | Address line 4 | string | false |
| address5 | Address line 5 | string | false |
| address6 | Address line 6 | string | false |
| county | County name | string | false |
| postcode | Postal/ZIP code | string | false |
| country | Country ID | int | true |
| phone | Contact phone number | string | false |

> Sample Add Account Address Request

```php
$account_id = 1;
$data = array(
"accountaddress" => array(
    array(
      "name" => "test1",
      "address1" => "line 1",
      "address2" => "line 2",
      "address3" => "line 3",
      "address4" => "line 4",
      "address5" => "line 5",
      "address6" => "line 6",
      "county" => "county",
      "postcode" => "postcode",
      "country" => 1,
      "phone" => "phone"
    )
)
);

$curl = curl_init();
curl_setopt_array($curl, array(
CURLOPT_URL => "https://external.futureticketing.ie/v1/private/account/{$account_id}/address/add",
CURLOPT_RETURNTRANSFER => true,
CURLOPT_ENCODING => '',
CURLOPT_MAXREDIRS => 10,
CURLOPT_TIMEOUT => 0,
CURLOPT_FOLLOWLOCATION => true,
CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
CURLOPT_CUSTOMREQUEST => 'POST',
CURLOPT_POSTFIELDS => json_encode($data),
CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: Bearer '.$authKey
),
));

$response = curl_exec($curl);
curl_close($curl);
```

#### Response

The request will respond with a JSON string containing the details of the newly created address, including the assigned address ID and confirmation of the successfully stored address information.

> Sample Add Account Address Response
>
> ```php
> [\
>     {\
>         "added": "accountaddress",\
>         "id": 4,\
>         "data": {\
>             "id": 4,\
>             "uuid": "5abc2dd2-c3bb-4ee7-bd06-882f04ee1861"\
>         }\
>     }\
> ]
> ```

### List Address _(GET)_

_Endpoint: [https://external.futureticketing.ie/v1/private/account/{account\_id}/address](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address)_

This is the endpoint for retrieving address information associated with a specific customer account. The addresses are returned sorted according to the specified order parameter, with pagination support.

#### Arguments

Values should be passed in the URL in the following order:
_[https://external.futureticketing.ie/v1/private/account/{account\_id}/address/{page}/{limit}/{order}](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address/%7Bpage%7D/%7Blimit%7D/%7Border%7D)_

For example:
_[https://external.futureticketing.ie/v1/private/account/75736/address/1/10/asc](https://external.futureticketing.ie/v1/private/account/75736/address/1/10/asc)_

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **account\_id** | The ID of the account to retrieve addresses for | int | true |
| **page** | Page number for pagination | int | false |
| **limit** | Number of addresses to return per page | int | false |
| **order** | Sort order (‘asc’ or ‘desc’) | string | false |

> Sample Address List Request

```php
$account_id = 75736;
$ch = curl_init();
curl_setopt_array($ch, array(
CURLOPT_URL => "https://external.futureticketing.ie/v1/private/account/{$account_id}/address/1/10/asc",
CURLOPT_RETURNTRANSFER => true,
CURLOPT_ENCODING => '',
CURLOPT_MAXREDIRS => 10,
CURLOPT_TIMEOUT => 0,
CURLOPT_FOLLOWLOCATION => true,
CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
CURLOPT_CUSTOMREQUEST => 'GET',
CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: Bearer '.$authKey
),
));
$response = curl_exec($ch);
curl_close($ch);
```

#### Response

The request will respond with a JSON string that contains the list of addresses associated with the specified account, including details such as address lines, postal code, and country information. It also returns pagination metadata including the current page, limit used, and total count of addresses.

> Sample Address List response
>
> ```php
> {
>   "current_page": 1,
>   "limit": 10,
>   "total": 2,
>   "data": [\
>     {\
>       "id": 12345,\
>       "account_id": 75736,\
>       "address1": "123 Main Street",\
>       "address2": "Apartment 4B",\
>       "address3": "Downtown",\
>       "address4": "",\
>       "address5": "",\
>       "address6": "",\
>       "postcode": "12345",\
>       "country_id": 1,\
>       "country": "Ireland",\
>       "country_iso": "IE",\
>       "primary_address": 0,\
>       "phone": 123,\
>       "archived": 0\
>     },\
>     {\
>       "id": 12346,\
>       "account_id": 75736,\
>       "address1": "456 Second Avenue",\
>       "address2": "",\
>       "address3": "",\
>       "address4": "",\
>       "address5": "",\
>       "address6": "",\
>       "postcode": "54321",\
>       "country_id": 1,\
>       "country": "Ireland",\
>       "country_iso": "IE",\
>       "primary_address": 0,\
>       "phone": 123,\
>       "archived": 0\
>     }\
>   ]
> }
> ```

### Get Address _(GET)_

_Endpoint: [https://external.futureticketing.ie/v1/private/account/{account\_id}/address/get/{address\_id}](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address/get/%7Baddress_id%7D)_

This endpoint retrieves a specific address associated with a customer account. It returns detailed information about the requested address including address lines, postal code, and country information.

#### Arguments

Values should be passed in the URL in the following order:
_[https://external.futureticketing.ie/v1/private/account/{account\_id}/address/get/{address\_id}](https://external.futureticketing.ie/v1/private/account/%7Baccount_id%7D/address/get/%7Baddress_id%7D)_

For example:
_[https://external.futureticketing.ie/v1/private/account/13/address/get/11](https://external.futureticketing.ie/v1/private/account/13/address/get/11)_

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **account\_id** | The ID of the account the address belongs to | int | true |
| **address\_id** | The ID of the specific address to retrieve | int | true |

> Sample Get Account Address Request

```php
$account_id = 13;
$address_id = 11;
$curl = curl_init();

curl_setopt_array($curl, array(
CURLOPT_URL => "https://external.futureticketing.ie/v1/private/account/{$account_id}/address/get/{$address_id}",
CURLOPT_RETURNTRANSFER => true,
CURLOPT_ENCODING => '',
CURLOPT_MAXREDIRS => 10,
CURLOPT_TIMEOUT => 0,
CURLOPT_FOLLOWLOCATION => true,
CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
CURLOPT_CUSTOMREQUEST => 'GET',
CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer '.$authKey
),
));

$response = curl_exec($curl);
curl_close($curl);
```

#### Response

The request will respond with a JSON string containing the details of the requested address, including address lines, postal code, and associated country and county information.

> Sample Get Account Address response
>
> ```php
> {
>   "data": [\
>     {\
>       "id": 11,\
>       "account_id": 13,\
>       "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\
>       "address1": "456 Second Avenue",\
>       "address2": "",\
>       "address3": "",\
>       "address4": "",\
>       "address5": "",\
>       "address6": "",\
>       "postcode": "54321",\
>       "country_id": 1,\
>       "country": "Ireland",\
>       "country_iso": "IE",\
>       "primary_address": 0,\
>       "phone": 123,\
>       "archived": 0\
>     }\
>   ]
> }
> ```

### Update Address _(PUT)_

To Update Customer account Address you will need to do a **PUT** request passing in the Customer ID and Address ID to
the endpoint

> Sample Update Account Address request

```php
$data = array(
    "name" => "test28",
    "address1" => "line 1",
    "address2" => "line 2",
    "address3" => "line 3",
    "address4" => "line 4",
    "address5" => "line 5",
    "address6" => "line 6",
    "county" => "county",
    "postcode" => "postcode",
    "country" => 1,
    "phone" => "phone",
    "archived" => 0
);
$customer_id = $_POST['customer_id'];
$address_id = $_POST['address_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/'.$customer_id.'/address/update/'.$address_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, PUT);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Update Account Address Response

```json
{
    "data": [\
        {\
            "updated": "accountaddress",\
            "id": "555"\
        }\
    ]
}
```

### Update Category _(POST)_

To Update a Customer Account Category you will need to do a **POST** request passing in the Customer ID to the endpoint.

Setting _overwrite_ to true will remove any current Categories linked to the Customer and replace with the array sent
in.

Setting _overwrite_ to false will attempt to add the Category to the Customer Account if it does not already exist.

> Sample Update Account Category request

```php
$data = array(
    "accountcategory" => array(
        array(
            "category_id" => "3",
            "added" => "2022-05-13 12:16:00"
        )
    ),
    "overwrite" => false
);
$customer_id = $_POST['customer_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/'.$customer_id.'/category/update');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, PUT);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Update Category Response

```json
[\
    {\
        "updated": "accountcategory",\
        "id": "3"\
    }\
]
```

### Change Password _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1//private/account/customer/changepass](https://external.futureticketing.ie/v1//private/account/customer/changepass)_

This end point allows a customer to change their password directly, without the need to recieve an email prompt.
If the user account is found on the system, the endpoint will then check if the new password and confirm password
fields match. If this is true then the password for the account will be changed.
This is a private request and will require a bearer token for Authorization

> Sample change Password request

```php
$data = array(
    "account_uuid" => $_POST['user_order_account_uuid'],
    "new_password" => "password123",
    "confirm_password" =>"password123"
);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1//private/account/customer/changepass');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

If the account was found and new password and confirm password matchthe below response will be given.

> Example JSON Response

```json
{
    "sent":true
}
```

### Active Tickets _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/account/activeticket](https://external.futureticketing.ie/v1/private/account/activeticket)_

This endpoint returns a list of active tickets for a user account.

#### Request Body Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `account_uuid` | string | Yes | UUID of the user account whose tickets you want to fetch. |
| `event_id` | int | No | Filter tickets by a specific event ID. |
| `event_uuid` | string | No | Filter tickets by a specific event UUID. |
| `ignore_event_uuid` | string | No | Exclude tickets for event UUID given. |
| `expand` | array of strings | No | Allows obtaining additional details from the expandable options list |

**Notes:**
\- `account_uuid` is required; all other parameters are optional.
\- Only the listed values are valid for the `expand` array.

**Expandable options available**

| Name | Description |
| --- | --- |
| ticket\_data | Include detailed ticket data. |
| ignore\_already\_accepted | Exclude tickets already accepted. |
| pending\_accept | Include tickets pending acceptance. |
| pending\_transfer | Include tickets pending transfer. |
| transferred | Include tickets already transferred. |

> Sample Active Tickets request

```php
$data = array(
    "account_uuid" => "b1a2c3d4-e5f6-7890-abcd-1234567890ef",
    "event_id" => 123,
    "ignore_event_uuid" => array("x1y2z3a4-b5c6-7890-defg-112233445566"),
    "expand" => array("ticket_data", "pending_accept")
);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/account/activeticket');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that contains the list of active tickets associated with the specified
account, including detailed ticket information if requested via the `expand` parameter.

```json
{
"transfer": true,
"data": {
    "active": [\
      {\
        "order_id": "92105",\
        "order_uuid": "f3b8e7d4-c9a1-4e6f-8012-a567b123c456",\
        "ticket_uuid": "a825e13c-a0c7-48c2-bf21-1373c6a8621a",\
        "ticket_id": "188401",\
        "account_id_set": null,\
        "barcode": "5091873264510",\
        "external_barcode": null,\
        "seat": "TRIBUNE 1-12-05",\
        "product_id": "715",\
        "first_name": "Joe",\
        "last_name": "Doe",\
        "account_id": "12345",\
        "product_name": "VIP Hospitality",\
        "product_category_id": "201",\
        "product_type_id": "1",\
        "product_category_name": "Category 1",\
        "club_icon": {\
          "home": {\
            "id": "1",\
            "name": "Team Alpha",\
            "image": "https://dummy-image-url.com/alpha_icon.png"\
          },\
          "away": {\
            "id": "2",\
            "name": "Team Beta",\
            "image": "https://dummy-image-url.com/beta_icon.png"\
          }\
        },\
        "allow_wallet": true,\
        "allow_android": true,\
        "allow_ios": true\
      }\
    ],
    "pending_accept": [\
      {\
        "order_id": "100010",\
        "order_uuid": "e4f3c2b1-0a9b-8c7d-6e5f-4a3b2c1d0e9f",\
        "ticket_uuid": "2d3876e9-daf6-4179-9dcc-49985e212aac",\
        "ticket_id": "210987",\
        "account_id_set": null,\
        "barcode": "3154879026351",\
        "external_barcode": null,\
        "seat": "401-1-01",\
        "product_id": "512",\
        "first_name": "Alice",\
        "last_name": "Smith",\
        "account_id": "12345",\
        "product_name": "General Admission",\
        "product_category_id": "305",\
        "product_type_id": "1",\
        "product_category_name": "Tribune 3 - Category 2",\
        "transfer_first_name": "Joe",\
        "transfer_last_name": "Doe",\
        "transfer_uuid": "eac4355f-9fc2-4dae-bbac-d3841769aeb0",\
        "transfer_ticket_uuid": "a71830e7-ff14-4289-94ca-e2854a32fa32",\
        "transfer_started": "2025-09-20 18:26:42",\
        "club_icon": {\
          "home": {\
            "id": "1",\
            "name": "Team Gamma",\
            "image": "https://dummy-image-url.com/gamma_icon.png"\
          },\
          "away": {\
            "id": "3",\
            "name": "Team Delta",\
            "image": "https://dummy-image-url.com/delta_icon.png"\
          }\
        },\
        "allow_wallet": true,\
        "allow_android": true,\
        "allow_ios": true\
      }\
    ],
    "pending_transfer": [\
      {\
        "order_id": "100010",\
        "order_uuid": "e4f3c2b1-0a9b-8c7d-6e5f-4a3b2c1d0e9f",\
        "ticket_uuid": "2d3876e9-daf6-4179-9dcc-49985e212aac",\
        "ticket_id": "210987",\
        "account_id_set": null,\
        "barcode": "3154879026351",\
        "external_barcode": null,\
        "seat": "401-1-01",\
        "product_id": "512",\
        "first_name": "Joe",\
        "last_name": "Doe",\
        "account_id": "12345",\
        "product_name": "General Admission",\
        "product_category_id": "305",\
        "product_type_id": "1",\
        "product_category_name": "Tribune 3 - Category 2",\
        "transfer_first_name": "Alice",\
        "transfer_last_name": "Smith",\
        "transfer_uuid": "eac4355f-9fc2-4dae-bbac-d3841769aeb0",\
        "transfer_ticket_uuid": "a71830e7-ff14-4289-94ca-e2854a32fa32",\
        "transfer_started": "2025-09-20 18:26:42",\
        "club_icon": {\
          "home": {\
            "id": "1",\
            "name": "Team Gamma",\
            "image": "https://dummy-image-url.com/gamma_icon.png"\
          },\
          "away": {\
            "id": "3",\
            "name": "Team Delta",\
            "image": "https://dummy-image-url.com/delta_icon.png"\
          }\
        },\
        "allow_wallet": true,\
        "allow_android": true,\
        "allow_ios": true\
      }\
    ],
    "transferred": [\
      {\
        "order_id": "77042",\
        "order_uuid": "65e8d7c6-b5a4-4f3e-91d2-c789a6b5c4d3",\
        "ticket_uuid": "dda2d175-0377-43f8-b0ff-4b5cab43dbe4",\
        "ticket_id": "119852",\
        "account_id_set": null,\
        "barcode": "8907654321098",\
        "external_barcode": null,\
        "seat": "415-3-22",\
        "product_id": "601",\
        "first_name": "Joe",\
        "last_name": "Doe",\
        "account_id": "12345",\
        "product_name": "Staff Pass",\
        "product_category_id": "306",\
        "product_type_id": "15",\
        "product_category_name": "Tribune 4 - Staff",\
        "transfer_first_name": "Adam",\
        "transfer_last_name": "Johnson",\
        "transfer_uuid": "7a22b170-70c2-41f1-a76c-91f47aecb0a5",\
        "transfer_ticket_uuid": "7ecfb1d0-67ba-40e6-823d-f2b5b22b7b27",\
        "transfer_started": "2025-07-24 19:33:46",\
        "club_icon": {\
          "home": {\
            "id": "1",\
            "name": "Team Epsilon",\
            "image": "https://dummy-image-url.com/epsilon_icon.png"\
          },\
          "away": {\
            "id": "4",\
            "name": "Team Zeta",\
            "image": "https://dummy-image-url.com/zeta_icon.png"\
          }\
        },\
        "allow_wallet": true,\
        "allow_android": true,\
        "allow_ios": true\
      }\
    ]
}
}
```

**Note:** transfer (true/false) – Indicates whether ticket transfer transactions have been found for the account.

## Customer Company

_Endpoint : [https://external.futureticketing.ie/v1/private/company](https://external.futureticketing.ie/v1/private/company)_

This is the main private end point for interacting with Company objects on your Future Ticketing account. Any
interaction available with the Company objects will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Company ID | int | true |
| account\_id | Account ID | int | false |
| address\_id | Address ID | int | false |
| external\_id | External ID | int | false |
| uuid | Company UUID | uuid | false |
| name | Company Name | string | true |
| added | Added Date | datetime | false |

### List _(GET)_

To get a listing of current Companies in your database you can use this end point.
The Companies are returned sorted by Company ID with the oldest Company appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Company List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/company');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/company/page/limit/order](https://external.futureticketing.ie/v1/private/company/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/company/1/20/name](https://external.futureticketing.ie/v1/private/company/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Companies
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Companies found to be used for paging. It also returns the value and direction by which you
are ordering the resluts if applicable.

> Sample Account List response

```json
{
    "data": [\
        {\
            "company_id": "99",\
            "account_id": "2",\
            "address_id": "2",\
            "external_id": "123",\
            "uuid": "43h6549f5-1956-486hS-b62d-l123p30e2f83",\
            "name": "ACME INC",\
            "added": "2020-02-17 12:14:00"\
        },\
         {\
            "company_id": "99",\
            "account_id": "2",\
            "address_id": "2",\
            "external_id": "123",\
            "uuid": "58h6549f5-2456-4868d-a91d-l123p30u4h57",\
            "name": "Bakers Ltd.",\
            "added": "2020-05-15 14:44:00",\
        }\
    ],
    "currentpage": 1,
    "limit": "2",
    "total": "111",
    "order": "name",
    "direction": "ASC"
}
```

### Add Company _(POST)_

_Endpoint: [https://external.futureticketing.ie/v1/private/company/add](https://external.futureticketing.ie/v1/private/company/add)_

To add a new Company in your database you can use this endpoint.

#### Arguments

The request body should be in JSON format and include the following parameters:

| Name | Value | Type | Required |
| --- | --- | --- | --- |
| **name** | The Name of the Company | string | true |
| **external\_id** | An identifier for this Company from a 3rd party system | string | false |
| **account\_id** | An Account ID to link this Company to | int | false |
| **address\_id** | An Account Address ID to link this Company to | int | false |

> Sample Add Comment request

```php
$json = '{"company" :[\
            {\
                "name" : "Test Company Name"\
            }\
        ]}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/company/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string indicating success or failure.

> Sample Success Response

```json
[\
    {\
        "added": "company",\
        "id": 1\
    }\
]
```

## Rewards4Racing

This is the main private end point for interacting with Rewards4Racing accounts on your Future Ticketing account.

### Get account details by email _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/rewardsforsport/get/:email](https://external.futureticketing.ie/v1/private/rewardsforsport/get/:email)_

This is the main private end point for retrieving Rewards4Racing account details using the email of the account.

#### Arguments

| Name | Value | Type |
| --- | --- | --- |
| **:email** | Email address associated to the Rewards4Racing account | string |

> Sample request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/rewardsforsport/get/johndoe@futureticketing.ie');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that contained the Rewards4Racing _r4r\_account\_id_ ID account.

> Sample Response

```json
{
    "r4s_acc_id": 123456789,
    "email_queried": "johndoe@futureticketing.ie"
}
```

### Get point balance by account ID _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/rewardsforsport/account/:r4r\_account\_id](https://external.futureticketing.ie/v1/private/rewardsforsport/account/:r4r_account_id)_
This is the main private end point for retrieving Rewards4Racing point balance using the _r4r\_account\_id_ ID of the account.

#### Arguments

| Name | Value | Type |
| --- | --- | --- |
| **:r4r\_account\_id** | Rewards4Racing account ID | int |

> Sample request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/rewardsforsport/account/123456789');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that contains the Rewards4Racing _points_ balance for the account.
The p is the points balance, pc is the points balance as a currency formatted to 2 decimal places.

> Sample Response

```json
{
    "p": 78961,
    "pc": "789.61",
    "0": "789.61",
    "pcavailable": 789.61
}
```

## FT Rewards

This is the main private end point for interacting with Rewards accounts on your Future Ticketing account.

### Rewards Account Transactions _(POST)_

This endpoint returns a paginated list of rewards transactions for customer accounts.
_Endpoint : [https://external.futureticketing.ie/v1/private/rewards](https://external.futureticketing.ie/v1/private/rewards)_

#### Arguments

| Field | Description | Type |
| --- | --- | --- |
| updated\_since | Find any Rewards Transactions updated after this date. Dates should be sent in YYYY-MM-DD format | date |
| extend | Allows to obtain additional details for the items on the expandable options list. | Array of string |

**Expandable options available**

| Name | Description |
| --- | --- |
| balance | Include the balance for any valid and not expired points at the moment of the query |

> Sample request

```php
$data = array(
"extend" => array("balance")
);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/rewards');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
curl_close($ch);
```

#### Response

The request will respond with a JSON string that contains a paginated list of transactions.

| Field | Type | Description |
| --- | --- | --- |
| data | array | List of transaction objects. |
| currentpage | int | Current page number. |
| limit | int | Number of records per page. |
| total | string | Total number of transactions found. |
| page\_count | int | Total number of pages available. |
| query | object | Query parameters used, including any extended fields requested (e.g. balance). |

#### Transaction Object

| Field | Type | Description |
| --- | --- | --- |
| id | string | Unique transaction ID. |
| account\_id | string | ID of the account associated with the transaction. |
| category\_id | string | Category ID for the transaction (if applicable). |
| order\_id | string | Related order ID. |
| status | string | Status code of the transaction. |
| points | string | Number of points credited or debited. |
| value | string | Monetary value associated with the transaction. |
| added\_datetime | string | Date and time the transaction was added (YYYY-MM-DD HH:MM). |
| expiry\_date | string | Expiry date for the points, or “None” if not applicable. |
| type | string | Transaction type (e.g., “Credit”, “Debit”). |
| balance | int | Account balance after this transaction (if extended). |

> Sample Response

```json
{
"data": [\
    {\
      "id": "4",\
      "account_id": "2",\
      "category_id": "0",\
      "order_id": "194",\
      "status": "20",\
      "points": "50.00",\
      "value": "0.00",\
      "added_datetime": "2025-07-14 16:39",\
      "expiry_date": "None",\
      "type": "Credit",\
      "balance": 100\
    }\
    // ...\
],
"currentpage": 1,
"limit": 20,
"total": "4",
"page_count": 1,
"query": {
    "extend": [\
      "balance"\
    ]
}
}
```

## Ryft Payments

To use the Ryft Payment Processer via the API the cleint must firstly use the Ryft Onboarding feature found in the
dashboard.
Administration->Settings->Payment Account-> Ryft Payments.

Once the payment account has been setup, we can itialize a payment session via the /private/order/updatepaymentstatus/
endpoint.
To create the ryft payment session we must pass a ryft return url parameter to this endpoint. This URL will be used to
redirect the user to a page of their choice after 3d secure check.
Passing ryft\_returnUrl to the updatepaymentstatus endpoint will return Ryft Payment details that are needed to load the
integrated form in the Html page via javascript.

#### Arguments

| Name | Value | Type |
| --- | --- | --- |
| **:ryft\_returnUrl** | “Url of website” | string |

> Sample Update Order request to create Ryft Payment session

```php
$json = '{
    "order": [\
        {\
            "status_id" : 2,\
            "send_email" : 0,\
            "email" : "info@futureticketing.ie",\
            "order_email" : "info@futureticketing.ie",\
            "order_id" : 970\
\
        }\
    ],
     "ryft_returnUrl" : "checkout_page.com",

}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/updatepaymentstatus/970');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that contains Ryft Payment details in the payment\_return object that will be
used in the form initiliazer in the html/javascript.

> Sample Response with Ryft Payment Details

```json
{
        "updated": "order",
        "id": "970",
        "ticket": [{\
               ......\
            }\
        ],
        "payment_return": {
            "rpk": "pk_sandbox_Ynz2pbn7JdTD2jyH8MtPd3nWn2CxQp32L75eqYuiZplH2hjZTCvrpeqS73OShVcO",
            "rai": "ac_f3e278b8-36bb-4eba-8a66-f385c76adfb8",
            "rcn": "Ryft Payment",
            "rci": "IE",
            "rcur": "EUR",
            "uoppid": "15780303143121",
            "rcta": 42.86,
            "full_ryft_session": {
                "id": "ps_01JNE6PBAC0B6E9J91EKHD4QN7",
                "amount": 4286,
                "currency": "EUR",
                "paymentType": "Standard",
                "entryMode": "Online",
                "customerEmail": "stephen@futureticketing.ie",
                "enabledPaymentMethods": ["Card"],
                "returnUrl": "https:\/\/embed-dev8.futureticketing.ie\/c\/stephen_ryft_api_test\/home\/?event=108",
                "platformFee": 682,
                "status": "PendingPayment",
                "metadata": {
                    "orderId": "970"
                },
                "refundedAmount": 0,
                "clientSecret": "ps_01JNE6PBAC0B6E9J91EKHD4QN7_secret_ba4fad44-3081-4d11-855e-89a4c869377b",
                "statementDescriptor": {
                    "descriptor": "Future Ticketing",
                    "city": "the place"
                },
                "authorizationType": "FinalAuth",
                "captureFlow": "Automatic",
                "createdTimestamp": 1741012282,
                "lastUpdatedTimestamp": 1741012282
            },
            "rpl": "ps_01JNE6PBAC0B6E9J91EKHD4QN7_secret_ba4fad44-3081-4d11-855e-89a4c869377b",
            "rsid": "ps_01JNE6PBAC0B6E9J91EKHD4QN7"
        }
    }
```

#### Initilaize the ryft payment form

Once we have created the ryft payment session we use the ryft details returned in the response to initialize the payment form
To get started, include the script tag on your relevant HTML page and add the html form.

```html

<script src="https://embedded.ryftpay.com/v2/ryft.min.js"></script>

<form id="ryft-pay-form">
<!-- form will be embedded here -->
<button id="ryft-pay-btn">PAY GBP 24.99</button>
<div id="ryft-pay-error"></div>
</form>

Initialise the embedded form using the details from the ceate session response response

$response[0]['payment_return']['rpk']; //API public key
$response[0]['payment_return']['rai']; //Sub-Account ID
$response[0]['payment_return']['rpl']; //client secret

Ryft.init({
publicKey: "{{API public key}}",
clientSecret: "{{client secret}}",
accountId: "{{Sub-Account ID}}",
});

The form should now appear.
```

### Google Pay with Ryft

Just add this script to your html page, ryft payment form automatically handles this once you have the javascript
handler in place.

```html

<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
```

### Apple Pay with Ryft

To use Apple Pay a file needs to be installed on the root of the website server, please contact Future Ticketing if you
need help with this.

### Sample Example of full javascript/html implementation

The javascript implementation requires payment response handlers as displayed in the example to determine if payment has
been succesfull or not.

> Full Html/javascript sample

```html

<!DOCTYPE html>
<html lang="en">
<head>
    <script src="https://embedded.ryftpay.com/v2/ryft.min.js"></script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body>
    <div>
      <div className="Ryft--paysection">
        <form id="ryft-pay-form" className="Ryft--payform">
          <button id="pay-btn" disabled>PAY NOW</button>
          <div id="ryft-pay-error">
            <!-- populate this div with any errors -->
          </div>
        </form>
      </div>
    </div>
</body>
<script type="text/javascript">
    const clientSecret = "{{client secret}}";
    Ryft.init({
      publicKey: "{{API public key}}",
      clientSecret: "{{client secret}}",
      accountId: "{{Sub-Account ID}}",
      applePay: {
        merchantName: "My Business",
        merchantCountryCode: "GB",
      },
      googlePay: {
        merchantIdentifier: "merchant_123",
        merchantName: "My Business",
        merchantCountryCode: "GB",
      },
      fieldCollection: {
        billingAddress: {
          display: "full",
        },
      },
    });

    function handlePaymentResult(paymentSession) {
      if (
        paymentSession.status === "Approved" ||
        paymentSession.status === "Captured"
      ) {
        // call the  v1/private/ryft/savepayment endpoint
      }
      if (paymentSession.lastError) {
        const userFacingError = Ryft.getUserFacingErrorMessage(
          paymentSession.lastError
        );
        // Show userFacingError to customer
      }
    }

    Ryft.addEventHandler("walletPaymentSessionResult", (e) => {
      handlePaymentResult(e.paymentSession);
    });

    Ryft.addEventHandler("cardValidationChanged", (e) => {
      const payButton = document.getElementById("pay-btn");
      payButton.disabled = !e.isValid;
    });

    const form = document.getElementById("ryft-pay-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      Ryft.attemptPayment()
        .then((paymentSession) => {
          handlePaymentResult(paymentSession);
        })
        .catch((error) => {
          // Show error to customer
        });
    });
</script>
</html>
```

### Process The Ryft Payment

Once you have these functions in place you can then just click on pay now to pay.
This will capture the ryft payment attempt.
The response will be captured in function handlePaymentResult()

if paymentSession.status === “Approved” \|\| paymentSession.status === Captured, then we can complete the process by
calling the savepayment endpoint.
This will complete the process, update the order on Futureticketing and send the email.
If we recieve a different response you can show a message in line with that response.

### Finalize The Order

As mentioned before, once we have confirmed payment with Ryft through the handlePaymentResult() function we can then
complete/fullfil the order
by calling the v1/private/ryft/savepayment endpoint. This will send the email , book seats fully etc.

> sample request v1/private/ryft/savepayment

```php

ryft_payment_id = $response[0]['payment_return']['rsid']; //payment session id, returned in first call to create the payment session.
payment_session is the paymentSession object captured in handlePaymentResult function

$json = '{
    "order_id" : 970,
    "ryft_payment_id" : ryft_payment_id,
    "amount" : order_amount,
    "ryft_payment_details" : payment_session,
    "payment_provider_id" : 'order payment provider id',
    "order_origin" : "API",
    "send_email" : 0

}';
$ryft_curl = curl_init();
curl_setopt_array($ryft_curl,
    array(
        CURLOPT_URL => 'https://external.futureticketing.ie/v1/private/ryft/savepayment',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_HTTPHEADER => array(
            'Authorization:Bearer ' . $auth . ''
        ),
    )
);
```

### Updating the Payment session.

If you want to add more items to the order after the initial payment session has been created by
v1/private/order/cart/\[order\_uuid\]’ you will then need to update the payment session after that.
You do this by calling the updatepaymentstatus endpoint again but this time you will pass the payment session id that
was returned in initial payment session creation
$response\[0\]\[‘payment\_return’\]\[‘rsid’\] //payment session id.

> Sample Update Order request to update Ryft Payment session

```json

$json = '{
    "order": [\
        {\
            "status_id" => 2,\
            "send_email" => 0,\
            "email" => "info@futureticketing.ie",\
            "order_email" => "info@futureticketing.ie",\
            "order_id" => 970\
\
        }\
    ],
     "ryft_payment_session_id" => $response[0]['payment_return']['rsid']

}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/updatepaymentstatus/970');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
$result = curl_exec($ch);
```

### Update the form

After you have updated the payment session you will need to update the payment form and reload it/create a new form with
the updated values, in same way you created the form initially
you are then able to pay with the updated amount.
After this step you can continue as before to complete the order by just clicking the pay button and then depending on
the response call v1/private/ryft/savepayment endpoint/ show error message

## Venue

_Endpoint : [https://external.futureticketing.ie/v1/private/venue](https://external.futureticketing.ie/v1/private/venue)_

This is the main private end point for interacting with a Venue object on your Future Ticketing account. Any
interaction available with the Venue will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Venue ID | int | true |
| uuid | Venue UUID | string | true |
| cost\_code | Venue Cost Code | string | true |
| name | Venue Name | string | true |
| description | Venue Description | string | false |
| active | Venue Active | boolean | false |

### List _(GET)_

To get a listing of current Venues in your database you can use this end point.
The Venues are returned sorted by Venue ID with the oldest Venue appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Venues List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/venue');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/venue/page/limit/order](https://external.futureticketing.ie/v1/private/venue/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/venue/1/20/datetime](https://external.futureticketing.ie/v1/private/venue/1/20/datetime)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Venue(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount of Venues found to be used for paging.

> Sample Venue List response

```json
{
    "data" : [{\
            "id": "8",\
            "uuid": "c14db100-74fe-48a0-a519-0749b0e0b8c7",\
            "cost_code": "TVEN1",\
            "name": "Test Venue 1",\
            "description": "Test Venue 1 description",\
            "active": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Venue in your database you can use this end point.
A search is performed on the ‘uuid’ field with the information sent via the URL.

> Sample Venues GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/venue/get/c14db100-74fe-48a0-a519-0749b0e0b8c7');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Venue GET response

```json
{
    "data" : [{\
            "id": "8",\
            "uuid": "c14db100-74fe-48a0-a519-0749b0e0b8c7",\
            "cost_code": "TVEN1",\
            "name": "Test Venue 1",\
            "description": "Test Venue 1 description",\
            "active": "1"\
        }\
    ]
}
```

## Product Type

_Endpoint : [https://external.futureticketing.ie/v1/private/producttype](https://external.futureticketing.ie/v1/private/producttype)_

This is the main private end point for interacting with a Product Type object on your Future Ticketing account. Any
interaction available with the Product Type will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Product Type ID | int | true |
| uuid | Product Type UUID | string | true |
| name | Product Type Name | string | true |
| description | Product Type Description | string | false |
| active | Product Type Active | boolean | false |

### List _(GET)_

To get a listing of current Product Types in your database you can use this end point.
The Product Types are returned sorted by Product Type ID with the oldest Product Type appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Product Types List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/producttype');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/producttype/page/limit/order](https://external.futureticketing.ie/v1/private/producttype/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/producttype/1/20/name](https://external.futureticketing.ie/v1/private/producttype/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Product Type(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount found to be used for paging.

> Sample Product Type List response

```json
{
    "data" : [{\
            "id": "1",\
            "uuid": "c14db100-74fe-48a0-a519-07d3as20b8c7",\
            "name": "Adult",\
            "description": "Adult type description",\
            "active": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Product Type in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

> Sample Product Type GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/producttype/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Product Type GET response

```json
{
    "data" : [{\
            "id": "1",\
            "uuid": "c14db100-74fe-48a0-a519-07d3as20b8c7",\
            "name": "Adult",\
            "description": "Adult type description",\
            "active": "1"\
        }\
    ]
}
```

## Product Category

_Endpoint : [https://external.futureticketing.ie/v1/private/productcategory](https://external.futureticketing.ie/v1/private/productcategory)_

This is the main private end point for interacting with a Product Category object on your Future Ticketing account. Any
interaction available with the Product Category will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Product Category ID | int | true |
| name | Product Category Name | string | true |
| description | Product Category Description | string | false |
| active | Product Category Active | boolean | false |

### List _(GET)_

To get a listing of current Product Category in your database you can use this end point.
The Product Category are returned sorted by Product Category ID with the oldest Product Category appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Product Category List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/productcategory');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/productcategory/page/limit/order](https://external.futureticketing.ie/v1/private/productcategory/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/productcategory/1/20/name](https://external.futureticketing.ie/v1/private/productcategory/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Product Category(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount found to be used for paging.

> Sample Product Category List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Executive Box",\
            "description": "Executive Box description",\
            "active": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Product Category in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

> Sample Product Category GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/productcategory/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Product Category GET response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Executive Box",\
            "description": "Executive Box description",\
            "active": "1"\
        }\
    ]
}
```

## Product Area

_Endpoint : [https://external.futureticketing.ie/v1/private/productarea](https://external.futureticketing.ie/v1/private/productarea)_

This is the main private end point for interacting with a Product Area object on your Future Ticketing account. Any
interaction available with the Product Area will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Product Area ID | int | true |
| name | Product Area Name | string | true |
| description | Product Area Description | string | false |
| active | Product Area Active | boolean | false |

### List _(GET)_

To get a listing of current Product Area in your database you can use this end point.
The Product Area are returned sorted by Product Area ID with the oldest Product Area appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Product Area List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/productarea');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/productarea/page/limit/order](https://external.futureticketing.ie/v1/private/productarea/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/productarea/1/20/name](https://external.futureticketing.ie/v1/private/productarea/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Product Area(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount found to be used for paging.

> Sample Product Area List response

```json
{
    "data" : [{\
            "id": "1",\
            "uuid": "c14db100-74fe-48a0-a519-07d3d8whs28c7",\
            "name": "Reserved Enclosure",\
            "description": "Reserved Enclosure description",\
            "active": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Product Area in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

> Sample Product Area GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/productarea/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Product Area GET response

```json
{
    "data" : [{\
            "id": "1",\
            "uuid": "c14db100-74fe-48a0-a519-07d3d8whs28c7",\
            "name": "Reserved Enclosure",\
            "description": "Reserved Enclosure description",\
            "active": "1"\
        }\
    ]
}
```

## Event Category

_Endpoint : [https://external.futureticketing.ie/v1/private/eventcategory](https://external.futureticketing.ie/v1/private/eventcategory)_

This is the main private end point for interacting with a Event Category object on your Future Ticketing account. Any
interaction available with the Event Category will be made starting at this end point.

#### Attributes

| Name | Value | Type | Required |
| --: | :-- | --: | --: |
| **id** | Event Category ID | int | true |
| name | Event Category Name | string | true |
| type | Event Category Type Name | string | true |
| description | Event Category Description | string | false |
| active | Event Category Active | boolean | false |

### List _(GET)_

To get a listing of current Event Category in your database you can use this end point.
The Event Categorys are returned sorted by Event Category ID with the oldest Event Category appearing first. You
can change the amount returned and the ordering by passing in optional details to the
URL. By default the return list is set to do paging with a limit of 20 per page.

> Sample Event Category List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/eventcategory');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Arguments

There are some optional arguments that can be sent in the URL to filter the information. Values should be passed
in the URL in the following order - _[https://external.futureticketing.ie/v1/private/eventcategory/page/limit/order](https://external.futureticketing.ie/v1/private/eventcategory/page/limit/order)_ eg
_[https://external.futureticketing.ie/v1/private/eventcategory/1/20/name](https://external.futureticketing.ie/v1/private/eventcategory/1/20/name)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

#### Response

The request will respond with a JSON string that will list out the attributes of the Event Category(s)
as per the sample listed. It also returns the _Current Page_ number, the _Limit_ that is being used
and the _Total_ amount found to be used for paging.

> Sample Event Category List response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Season Ticket 2021",\
            "type": "Season Ticket",\
            "description": "Season Ticket 2021 description",\
            "active": "1"\
        }\
    ],
    "currentpage" : 1,
    "limit" : "1",
    "total" : "1"
}
```

### GET _(GET)_

To get a current Event Category in your database you can use this end point.
A search is performed on the ‘id’ field with the information sent via the URL.

> Sample Event Category GET request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/eventcategory/get/1');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

> Sample Event Category GET response

```json
{
    "data" : [{\
            "id": "1",\
            "name": "Season Ticket 2021",\
            "type": "Season Ticket",\
            "description": "Season Ticket 2021 description",\
            "active": "1"\
        }\
    ]
}
```

## Entry

_Endpoint : [https://external.futureticketing.ie/v1/private/entry](https://external.futureticketing.ie/v1/private/entry)_

This is the main private end point for Entry/Scanning related options for your dashboard.

### Scan _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/entry/scan](https://external.futureticketing.ie/v1/private/entry/scan)_

To attempt to Scan a barcode you can send the details to this end point. A Barcode and Scanner Name needs to be passed.

#### Force Scan

There is an optional argument that can be sent in at the end of the URL to force the scan to go through. Placing 1 at
the end of the request will force the system to marked the barcode as scanned. For
example - \* [https://external.futureticketing.ie/v1/private/entry/scan/\[—barcode—\]/\[—scanner\_name—\]/1](https://external.futureticketing.ie/v1/private/entry/scan/[--barcode--]/[--scanner_name--]/1)

> Sample Barcode Scan request

```php
$barcode = $_POST['barcode'];
$scanner_name = $_POST['scanner_name'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/entry/scan/'. $barcode .'/'. $scanner_name);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the Barcode
scan as per the sample listed. It also returns additional detail depending on the result of the scan.

> Sample Barcode Scan response

```json
{
    "data" : {
        "e": "eCode7",
        "c": "Future Ticketing Demo",
        "d": {
            "dm": "WRONG TIME",
            "den": "Todays event allows 10 mins before & 10 after",
            "ded": "2018-10-15 13:10:00",
            "dpn": "Todays Match Day ticket",
            "dst": "",
            "col": "#008800"
        }
    }
}
```

#### Response Detail

In the returned JSON the attributes are as follows:

```
e : This holds the return code for the scan (eCode5, eCode6, eCode7)
    - eCode6 : Scan OK - allowed entry
    - eCode5 :
        - Already Scanned Today - not allowed entry
        - Wrong Entry Point - not allowed entry
    - eCode7 :
        - Order/Ticket Cancelled - not allowed entry
        - Wrong Day / Wrong Time - not allowed entry
c : This holds the Clients name
d : This holds any other details that need to be returned. This can differ slightly depending on the code being returned
    dm : This is the text we display in the scanner title bar
    den : This holds additional information that we want to show to the scanner
    ded : This shows the Event date time for the scanned ticket
    dpn : This shows the Product Name for the scanned ticket
    dst : This shows additional information that may be needed to be shown to the scanner - eg 'VIP ticket direct to VIP entrance'
    col : This holds a hex value colour for the scanner to use - we use the following:
        Green - Scan Ok and can proceed
        Amber - Scan Ok but extra information is displayed eg check for student id
        Red - Scan not Ok - do not allow entry due to message being displayed
```

### Passout _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/entry/passout](https://external.futureticketing.ie/v1/private/entry/passout)_

To mark a Barcode as having left the venue use this end point. It will allow the Barcode to be scanned back in. A
Barcode and Scanner Name needs to be passed.

> Sample Barcode Scan request

```php
$barcode = $_POST['barcode'];
$scanner_name = $_POST['scanner_name'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/entry/passout/'. $barcode .'/'. $scanner_name);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the Passout
request as per the sample listed. It returns with a similar format to the regular Barcode scan.

> Sample Barcode Passout response

```json
{
    "data" : {
        "e": "eCode6",
        "d": {
            "dm": "OK",
            "den": "",
            "ded": "",
            "dpn": "Scanned Out",
            "dst": "Give customer details of re-entry areas",
            "col": "#008800",
            "sc" : "1478589542152"
        }
    }
}
```

### External Barcode Detail _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/entry/externaldetail](https://external.futureticketing.ie/v1/private/entry/externaldetail)_

To search for an Order based on an External barcode you can send the details to this end point.

> Sample Barcode Scan request

```php
$barcode = $_POST['barcode'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/entry/externaldetail/'. $barcode);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the request as per the sample listed.

> Sample External Barcode Detail response

```json
{
    "data": {
        "order": {
            "id": "35816",
            "account_uuid": "325436d2f-fa4e-0979-751a-6b7657647643ad",
            "status": "Email Sent",
            "email": "joebloggs@futureticketing.ie",
            "company": "",
            "title": null,
            "first_name": "Joe",
            "second_name": "Bloggs",
            "phone": "+3538798764320",
            "barcode": "756619752680"
        },
        "order_detail": [\
            {\
                "event_name": "Test Event",\
                "product_name": "Test Entry",\
                "event_date": "2022-11-26 00:00:00",\
                "product_category_id": "83",\
                "product_area_id": "33",\
                "ft_barcode": "7566183512020",\
                "external_barcode": "4321687324134683",\
                "allow_entry": "1",\
                "ticket_valid": "1",\
                "no_scan_available": "1",\
                "seating_plan_info": null,\
                "ticket_cancelled": "0",\
                "ticket_id": "714706"\
            },\
            {\
                "event_name": "Test Event",\
                "product_name": "Test Add-On",\
                "event_date": "2022-11-26 00:00:00",\
                "product_category_id": "887",\
                "product_area_id": "36",\
                "ft_barcode": "7566250876530",\
                "external_barcode": "4321687324134683",\
                "allow_entry": "1",\
                "ticket_valid": "1",\
                "no_scan_available": "1",\
                "seating_plan_info": null,\
                "ticket_cancelled": "0",\
                "ticket_id": "714707"\
            }\
        ]
    }
}
```

### Validate Email in Event _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/entry/validate](https://external.futureticketing.ie/v1/private/entry/validate)_

To check if an Order / Account currently has tickets that are active for an Event. This is currently
searchable using the ‘email’ address of the customer and ‘event\_id’ in question.

> Sample Validate Email in Event request

```php
$json = '{
    "email" : "testing@test.com",
    "event_id" : 2
}';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/entry/validate');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPPOST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the request as per the sample listed.
If the Email/Event ID combination has at least one valid Order or Ticket the ‘valid’ attribute will be returned as true,
otherwise it will be returned with false.

> Sample Validate Email in Event response

```json
{
    "valid": true,
    "data": [\
        {\
            "order_id": "1200",\
            "ticket": [\
                {\
                    "barcode": "3339790332006",\
                    "external_barcode": null,\
                    "product_id": "1",\
                    "product_name": "Test Product 1"\
                },\
                {\
                    "barcode": "3339807627002",\
                    "external_barcode": null,\
                    "product_id": "2",\
                    "product_name": "Test Product 2"\
                }\
            ]\
        }\
    ],
    "currentpage" : 1,
    "limit" : 20,
    "total" : 1
```

### Add External Barcode _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/entry/addexternal](https://external.futureticketing.ie/v1/private/entry/addexternal)_

To add a barcode from an external provider so it can be scanned on the Future Ticketing system. You may assign an
external id to multiple ticket items.

> Sample Add External Barcode request

```php
$data = "link"=>{
        "external_id"=>"43653543645473",
        "ticket_id"=>{
            "0"=>"714706",
            "1"=>"714707"
        }
    }
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/entry/addexternal/'. $order_id);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPPOST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the Add External Barcode
request as per the sample listed. It returns with a similar format to the regular Barcode scan.

> Sample Barcode Passout response

```json
{
    "status": "success",
    "message": "External barcode 532589098365 added",
    "data": {
        "id": "35816"
    }
}
```

## Ticket Protection

This API enables businesses to seamlessly integrate ticket protection services into their platforms. By using this API,
you can offer your customers a reliable and flexible way to protect their ticket purchases against unexpected events,
ensuring peace of mind for both you and your customers.

This is designed to provide coverage for a wide range of circumstances, such as cancellations, medical emergencies, or
other unforeseen disruptions. It is a scalable, secure, and easy-to-use solution, ideal for any company looking to
enhance the value of their ticketing services and increase customer satisfaction.

Note: Ticket protection works only with Ft Payment account or Stripe Connected account

### GET Quote _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/quote](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/quote)_

To get ticket protection quote for your order use this endpoint.

> Sample Booking request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/quote');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list all details of the quote for order specified

> Sample create quote response

```json
{
    "id": "H6GBR-L9B7W-INS",
    "total_price": "25.20",
    "total_price_formatted": "€25.20",
    "policy": [\
        {\
            "id": "32310d16-42b3-4830-90f9-edc67e2c6a3c",\
            "details": {\
                "policy_type_version": "1",\
                "policy_type_slug": "event_ticket_protection_v1",\
                "policy_name": "Future Ticketing - Booking Refund Protection (EU)",\
                "policy_code": "FTEUV01",\
                "policy_version": "89c08eb9-69d8-4507-97bd-e183f975101f",\
                "content": {\
                    "title": "Booking Refund Protection",\
                    "header": null,\
                    "description": "N/A",\
                    "optout_msg": "",\
                    "inclusions": [],\
                    "exclusions": [],\
                    "disclaimer": "I have read and agreed to the plan terms. ",\
                    "disclaimer_html": "<p data-block-key=\"cgh44\"><i>I have read and agreed to the plan terms</i>. </p>",\
                    "payment_disclaimer": "",\
                    "in_path_disclaimer": ""\
                },\
                "underwriter": {\
                    "disclaimer": "Policy is Underwritten by Beazley Syndicate",\
                    "name": "Beazley Syndicate"\
                },\
                "policy_currency": "EUR"\
            },\
            "benefits": [\
                {\
                    "benefit_content_id": "5916b91b-7c3e-4ebd-90e9-a11868ec9d1b",\
                    "description": "Booking Refund Protection",\
                    "limit": 252,\
                    "limit_policy_currency": 252,\
                    "limit_formatted": "€252.00",\
                    "limit_policy_currency_formatted": "€252.00"\
                }\
            ],\
            "cover_amount": 252\
        }\
    ],
    "url": "https://www.xcover.com/en/pds/H6GBR-L9B7W-INS",
    "message": "Cover Genius protection successfully retrieved",
    "code": 200
}
```

### Booking _(GET)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/booking](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/booking)_

To get ticket protection booking use this endpoint.

> Sample Booking request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/booking');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPGET, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the results of the ticket protection if it exists.

> Sample Booking response

```json
{
    "code": 200,
    "data": [\
        {\
            "id": "H6GBR-L9B7W-INS",\
            "status": "CONFIRMED",\
            "currency": "EUR",\
            "total_price": 25.2,\
            "total_price_formatted": "€25.20",\
            "partner_transaction_id": "258_904",\
            "created_at": "2025-03-25T13:55:06.509480Z",\
            "updated_at": "2025-03-26T09:18:31.170527Z",\
            "pds_url": "https://www.xcover.com/en/pds/H6GBR-L9B7W-INS",\
            "security_token": "ip3Xu-7EVNn-kiD9f-5dQ4E",\
            "quotes": [\
                {\
                    "id": "32310d16-42b3-4830-90f9-edc67e2c6a3c",\
                    "policy_start_date": "2025-03-25T13:55:06.499789+00:00",\
                    "policy_end_date": "2025-12-16T23:59:59+01:00",\
                    "status": "CONFIRMED",\
                    "price": 25.2,\
                    "price_formatted": "€25.20",\
                    "policy": {\
                        "policy_type": "event_ticket_protection",\
                        "policy_type_version": "1",\
                        "policy_type_slug": "event_ticket_protection_v1",\
                        "policy_type_group_name": "event",\
                        "policy_name": "Future Ticketing - Booking Refund Protection (EU)",\
                        "policy_code": "FTEUV01",\
                        "policy_version": "89c08eb9-69d8-4507-97bd-e183f975101f",\
                        "category": "event_ticket_protection",\
                        "content": {\
                            "title": "Booking Refund Protection",\
                            "header": null,\
                            "description": "N/A",\
                            "optout_msg": "",\
                            "inclusions": [],\
                            "exclusions": [],\
                            "disclaimer": "I have read and agreed to the plan terms. ",\
                            "disclaimer_html": "<p data-block-key=\"cgh44\"><i>I have read and agreed to the plan terms</i>. </p>",\
                            "payment_disclaimer": "",\
                            "in_path_disclaimer": ""\
                        },\
                        "underwriter": {\
                            "disclaimer": "Policy is Underwritten by Beazley Syndicate",\
                            "name": "Beazley Syndicate"\
                        },\
                        "claim_selector_id": "0d5d86cc-fa57-4cdd-9def-efae75099bce",\
                        "policy_currency": "EUR"\
                    },\
                    "insured": null,\
                    "tax": {\
                        "total_tax": 0.45,\
                        "total_amount_without_tax": 24.75,\
                        "total_tax_formatted": "€0.45",\
                        "total_amount_without_tax_formatted": "€24.75",\
                        "taxes": [\
                            {\
                                "tax_amount": 0.45,\
                                "tax_code": "IPT",\
                                "tax_amount_formatted": "€0.45"\
                            }\
                        ]\
                    },\
                    "duration": "266 09:04:52.500211",\
                    "benefits": [\
                        {\
                            "benefit_content_id": "5916b91b-7c3e-4ebd-90e9-a11868ec9d1b",\
                            "description": "Booking Refund Protection",\
                            "limit": 252,\
                            "limit_policy_currency": 252,\
                            "limit_formatted": "€252.00",\
                            "limit_policy_currency_formatted": "€252.00"\
                        }\
                    ],\
                    "commission": {\
                        "partner_commission": 13.86,\
                        "partner_commission_formatted": "€13.86",\
                        "surcharge_commission": 0,\
                        "surcharge_commission_formatted": "€0.00",\
                        "total_commission": 13.86,\
                        "total_commission_formatted": "€13.86"\
                    },\
                    "created_at": "2025-03-25T13:55:06.499789Z",\
                    "confirmed_at": "2025-03-26T09:18:31.141188Z",\
                    "updated_at": "2025-03-26T09:18:31.152180Z",\
                    "cancelled_at": null,\
                    "is_renewable": false,\
                    "is_pricebeat_enabled": null,\
                    "cover_amount": 252,\
                    "cover_amount_formatted": "€252.00",\
                    "pds_url": "https://www.xcover.com/en/pds/H6GBR-L9B7W-INS?policy_type=event_ticket_protection_v1",\
                    "attachments": [],\
                    "files": [],\
                    "custom_documents": null,\
                    "extra_fields": {\
                        "days_before_event": "267 days, 0:00:00",\
                        "event_date_time": "2025-12-16T23:59:59+01:00",\
                        "total_ticket_price": 252,\
                        "package_currency": "EUR",\
                        "tickets": [\
                            {\
                                "type": "table product",\
                                "price": 252,\
                                "ticket_id": "3_3804_0_0"\
                            }\
                        ]\
                    },\
                    "surcharge": {\
                        "total_amount": null,\
                        "total_amount_formatted": null,\
                        "surcharges": null\
                    },\
                    "parent_quote_status": null,\
                    "next_renewal": null,\
                    "can_be_cancelled": true,\
                    "third_party_admins": [],\
                    "ombudsman_list": []\
                }\
            ],\
            "coi": {\
                "url": "https://www.xcover.com/en/coi/H6GBR-L9B7W-INS?security_token=ip3Xu-7EVNn-kiD9f-5dQ4E",\
                "pdf": "https://www.xcover.com/en/coi/H6GBR-L9B7W-INS.pdf?security_token=ip3Xu-7EVNn-kiD9f-5dQ4E"\
            },\
            "account_url": "https://www.xcover.com/en/account?id=b5ef101a-4747-49bd-a68a-0db073caaf99&signup_token=EB9vZ-41ZAw-u0qqI-T6JcF®ion=eu-central-1",\
            "sign_up_url": "https://www.xcover.com/en/account?id=b5ef101a-4747-49bd-a68a-0db073caaf99&signup_token=EB9vZ-41ZAw-u0qqI-T6JcF®ion=eu-central-1",\
            "policyholder": {\
                "first_name": "Branko",\
                "last_name": "Chomic",\
                "email": "branko@futureticketing.ie",\
                "phone": null,\
                "address1": null,\
                "address2": null,\
                "postcode": null,\
                "company": null,\
                "company_reg_id": null,\
                "middle_name": null,\
                "country": "FR",\
                "age": null,\
                "city": null,\
                "region": null,\
                "secondary_email": null,\
                "birth_date": null,\
                "allow_updates": true,\
                "fields_allowed_to_update": [\
                    "city",\
                    "birth_date",\
                    "region",\
                    "tax_payer_id",\
                    "address2",\
                    "last_name",\
                    "email",\
                    "age",\
                    "postcode",\
                    "first_name",\
                    "middle_name",\
                    "secondary_email",\
                    "address1",\
                    "company_reg_id",\
                    "phone",\
                    "company"\
                ]\
            },\
            "total_tax": 0.45,\
            "total_tax_formatted": "€0.45",\
            "total_premium": 24.75,\
            "total_premium_formatted": "€24.75",\
            "fnol_link": "https://www.xcover.com/en/account/claims/fnol?bookingID=H6GBR-L9B7W-INS&security_token=ip3Xu-7EVNn-kiD9f-5dQ4E",\
            "booking_agent": null\
        }\
    ]
}
```

### Booking Create _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/booking](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/booking)_

To create ticket protection booking use this endpoint.

> Sample Booking request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/booking');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPPOST, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will confirm booking of ticket protection for specific order.

> Sample Booking response

```json
{
    "code": 201,
    "message": "Insurance booking confirm"
}
```

### Create Quote _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/quote](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/quote)_

To create ticket protection quote for your order use this endpoint.

> Sample Booking request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/quote');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPPOST, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will list out the details of the quote

> Sample create quote response

```json
{
    "id": "H6GBR-L9B7W-INS",
    "total_price": "25.20",
    "total_price_formatted": "€25.20",
    "policy": [\
        {\
            "id": "32310d16-42b3-4830-90f9-edc67e2c6a3c",\
            "details": {\
                "policy_type_version": "1",\
                "policy_type_slug": "event_ticket_protection_v1",\
                "policy_name": "Future Ticketing - Booking Refund Protection (EU)",\
                "policy_code": "FTEUV01",\
                "policy_version": "89c08eb9-69d8-4507-97bd-e183f975101f",\
                "content": {\
                    "title": "Booking Refund Protection",\
                    "header": null,\
                    "description": "N/A",\
                    "optout_msg": "",\
                    "inclusions": [],\
                    "exclusions": [],\
                    "disclaimer": "I have read and agreed to the plan terms. ",\
                    "disclaimer_html": "<p data-block-key=\"cgh44\"><i>I have read and agreed to the plan terms</i>. </p>",\
                    "payment_disclaimer": "",\
                    "in_path_disclaimer": ""\
                },\
                "underwriter": {\
                    "disclaimer": "Policy is Underwritten by Beazley Syndicate",\
                    "name": "Beazley Syndicate"\
                },\
                "policy_currency": "EUR"\
            },\
            "benefits": [\
                {\
                    "benefit_content_id": "5916b91b-7c3e-4ebd-90e9-a11868ec9d1b",\
                    "description": "Booking Refund Protection",\
                    "limit": 252,\
                    "limit_policy_currency": 252,\
                    "limit_formatted": "€252.00",\
                    "limit_policy_currency_formatted": "€252.00"\
                }\
            ],\
            "cover_amount": 252\
        }\
    ],
    "url": "https://www.xcover.com/en/pds/H6GBR-L9B7W-INS",
    "code": 201
}
```

### Apply Quote _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/quote-update](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/quote-update)_

To apply ticket protection for your order use this endpoint.

> Sample Booking request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/quote-update');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPPOST, true);
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will confirm that ticket protection has been added

> Sample create quote response

```json
{
    "code": 201,
    "message": "Ticket protection with Cover Genius added to order 904"
}
```

### Remove Quote _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/order/:order\_id/insurance/quote-update](https://external.futureticketing.ie/v1/private/order/:order_id/insurance/quote-update)_

To delete ticket protection for your order use this endpoint.

> Sample Delete request

```php
$order_id = $_POST['order_id'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/'.$order_id.'/insurance/quote-update');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
$result = curl_exec($ch);
```

#### Response

The request will respond with a JSON string that will confirm that ticket protection has been removed

> Sample create quote response

```json
{
    "code": 200,
    "message": "Ticket protection with Cover Genius has been removed from order id 904"
}
```

## Artist

This section contains the private API endpoints for managing artist-related functionality. These endpoints require
authentication via a valid access token.

### List _(POST)_

_Endpoint : [https://external.futureticketing.ie/v1/private/artist](https://external.futureticketing.ie/v1/private/artist)_

To retrieve a list of artists, you can use this endpoint. It will return a paginated list of artists with their details.

#### URL Arguments

There are some optional arguments that can be included in the URL to paginate and order the information. These values
should be passed in the URL in the following order

_[https://external.futureticketing.ie/v1/public/artist/{page}/{limit}/{order}](https://external.futureticketing.ie/v1/public/artist/%7Bpage%7D/%7Blimit%7D/%7Border%7D)_

| Name | Value | Type |
| --- | --- | --- |
| **page** | Page No to view | int |
| **limit** | Limit to view per page | int |
| **order** | Field to order by in Ascending order _(one of the above attributes)_ | string |

Example:
_[https://external.futureticketing.ie/v1/public/artist/1/20/id](https://external.futureticketing.ie/v1/public/artist/1/20/id)_

#### Body Parameters

You can also filter the results by passing in a JSON object with the following fields in the body of the request.

```json
{
    "id": 1,
    "seo_url": "the-groovy-guitars",
    "expand": ["event_count_future"]
}
```

| Field | Description | Type |
| --- | --- | --- |
| id | Filter by the unique ID of the artist | int |
| seo\_url | Filter by the SEO-friendly URL identifier of the artist | string |
| name\_search | Filter by the name of the artist | string |
| lang | Use together with the name\_search filter to filter artists by language, using ISO 639-1 language codes (e.g., “en”, “fr”) | string |
| updated\_since | Find any Artist updated after this date. Dates should be sent in YYYY-MM-DD format | date |
| expand | Specify additional related data to include in the response | array of string |

**Expandable options available**

| Name | Description |
| --- | --- |
| event\_count\_future | Includes the list of the artist’s upcoming events |

> Sample Artist List request

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/artist/1/20/id');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json',
    'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$data = array(
    "id" => 1,
    "seo_url" => "the-groovy-guitars",
    "expand" => ["event_count_future"]
);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
curl_close($ch);
$result = json_decode($result, true);
```

#### Response

The request will respond with a JSON string that contains a list of artists and their details.

> Sample Artist List response

```json
{
    "data": [\
        {\
            "id": "1",\
            "uuid": "743a6a60-7023-410e-8719-bf7f54bc120d",\
            "name": "The Groovy Guitars",\
            "image": "",\
            "seo_url": "the-groovy-guitars",\
            "description": "<p>A high-energy rock band known for their captivating live performances and classic rock covers. Guaranteed to get the crowd dancing!</p>",\
            "type": "Band",\
            "social": "Facebook: /TheGroovyGuitars, Instagram: @GroovyGuitarsOfficial, Website: www.groovy-guitars.com",\
            "language": [\
                {\
                    "iso": "FR",\
                    "client_event_artist_name": "",\
                    "client_event_artist_description": ""\
                },\
                {\
                    "iso": "ES",\
                    "client_event_artist_name": "",\
                    "client_event_artist_description": ""\
                }\
            ],\
            "event_list": [\
                {\
                    "id": "12",\
                    "seo_url": "",\
                    "uuid": "33e52be0-3002-44d8-89f5-8a6199ccf099",\
                    "name": "Cover Genius PWA",\
                    "datetime": "2025-06-29 23:00",\
                    "description": "<p>Cover Genius PWA</p>",\
                    "image": "https://event-image-url-link.jpg",\
                    "open_sales": "2025-05-09 15:55",\
                    "close_sales": "2025-06-29 23:00",\
                    "schedule_id": "0"\
                }\
            ],\
            "event_count": 1\
        },\
        {\
            "id": "2",\
            "uuid": "c6b03406-b11f-4668-a653-dca7c3312193",\
            "name": "DJ Beatdrop",\
            "image": "",\
            "seo_url": "dj-beatdrop",\
            "description": "<p>An acclaimed electronic music DJ specializing in house and techno. With a unique sound and incredible mixing skills, DJ Beatdrop brings the ultimate party vibe.</p>",\
            "type": "DJ",\
            "social": "<p>SoundCloud: /DJBeatdrop, Twitter: @DJBeatdropOfficial</p>",\
            "language": [\
                {\
                    "iso": "FR",\
                    "client_event_artist_name": "",\
                    "client_event_artist_description": ""\
                },\
                {\
                    "iso": "ES",\
                    "client_event_artist_name": "",\
                    "client_event_artist_description": ""\
                }\
            ],\
            "event_list": [],\
            "event_count": 0\
        }\
    ],
    "currentpage": 1,
    "limit": 20,
    "total": "3"
}
```

# Status Tables

A lot of the examples include details of different status id’s. The listing below shows the different statuses and the
descriptions
related to the id. Status 5,6,7 all mark the order as a valid order that has been completed.

## Order Status

This controls the current status of an order. It allows an order to be moved from simply added to fully paid or
cancelled.

| ID | Description | Sale Complete |
| --- | --- | --- |
| 1 | Order Added to system | No |
| 2 | Order is awaiting payment to be made | No |
| 3 | Payment for the order was declined by the payment processor | No |
| 4 | Payment has been accepted by the payment processor | Yes |
| 5 | The PDF for the order has been automatically created and stored for the order | Yes |
| 6 | Order is complete and Paid but the Email was not sent | Yes |
| 7 | Order is complete and Paid but the Email was been sent to the customer | Yes |
| 8 | Order has been fully refunded | No |
| 9 | Order has been cancelled | No |
| 13 | Payment has been accepted and an Email is Queued for the Order receipt | Yes |
| 16 | A Partial Payment has been received for the Order | Yes |
| 17 | A Payment Request has been placed for the Order | No |
| 18 | The customer Abandoned their shopping cart | No |
| 19 | A Subscription Order is currently active | Yes |
| 20 | A Subscription Order is currently inactive | No |
| 29 | Order Updated - Previous order has been upgraded and linked to a new order | No |
| 30 | Order is on hold | No |
| 31 | Cancelled Hold - Order hold cancelled, tickets cancelled and seats released | No |

## Payment Provider

This holds the type of payment provider that was used for the Order. The below list are the methods currently supported.

| ID | Description |
| --- | --- |
| 1 | Realex |
| 2 | Paypal |
| 3 | Invoice |
| 4 | Complimentary |
| 5 | In House Card |
| 6 | Cash |
| 7 | Cheque |
| 8 | Voucher |
| 9 | Sponsor |
| 10 | Bank Transfer |
| 11 | Counter Sale |
| 12 | Pre Paid |
| 13 | Credit Card - Internal Sale |
| 15 | Stripe |
| 17 | Exhibitor |
| 19 | Worldnet |
| 21 | Pay on Arrival |
| 22 | Sage Pay |
| 23 | Test Mode |
| 24 | Future Ticketing Payments |
| 25 | Authipay |
| 26 | Card Stream |
| 27 | Citypay |
| 28 | V12 |
| 29 | Facilipay |
| 30 | Clover Payments |
| 31 | Rewards 4 Racing |
| 32 | Ticket Transfer |
| 33 | Invoice - Deferred |
| 34 | External Finance |
| 35 | Unified Payment Gateway |
| 40 | Tabby Finance |
| 41 | Go Cardless Payments |
| 42 | Stripe Terminal |
| 43 | Checkout |
| 44 | Premium Credit Financing |
| 45 | Bank Misr |
| 46 | Voucher Card |
| 47 | Ryft |
| 48 | Pay Tabs |
| 49 | Klarna |
| 50 | Cloda |
| 51 | ValU |
| 52 | TWINT |
| 53 | eCOMM |
| 54 | NGSER |
| 55 | Buckaroo |
| 56 | Tru |
| 57 | Souhoola |

## Extra Field Type

This holds the type of input field that the Extra Field will be displayed as.

| Type | Description |
| --- | --- |
| text | Standard Input Box |
| textarea | Standard Textarea Box |
| dropdown | Dropdown input with single or multiple values |
| styleddropdown | Dropdown input with single or multiple values that is displayed as a List Item to be styled |
| radio | Standard Radio button |
| checkbox | Standard Checkbox |
| label | A simple text label for separating inputs or adding additional descriptions |
| datetimeflat | An inline Date formatted input box |
| phonenumber | An input box that expects a formatted phone number to be entered |
| autoincrement | A field that is not displayed to the user but instead adds an incrementing number to each ticket purchased |
| DeliveryAddress | An extra field that allows the checkout to request a separate Delivery Address |
| MembershipName | A standard input box to request a full name that can be displayed on a ticket instead of the order name |
| MembershipNameFirst | A standard input box to request a first name that can be displayed on a ticket instead of the order first name |
| MembershipNameSecond | A standard input box to request a second name that can be displayed on a ticket instead of the order second name |

## Tax Options

This holds the options available to use for Tax/VAT purposes

| Type | Description |
| --- | --- |
| id | ID of Tax Option |
| uuid | UUIDv4 of Tax Option |
| name | Name of Tax Option |
| value\_type | Percentage / Numeric |
| value | Value for the Option |
| order | Ordering of the Option |
| active | Is the Option in use and Active |

## Product Types Reference

_This reference details the different product types used within the Future Ticketing system._

Product types are represented by integer values that determine how products are processed, displayed, and managed throughout the platform. These values control various aspects of the product workflow and reporting.

#### Product Type Values

| ID | Type | Description |
| --- | --- | --- |
| 1 | Regular Ticket | Standard admission ticket for events |
| 2 | Charges / fees | Additional fees or charges applied to orders |
| 3 | Voucher Code | Promotional or discount code that has be redeemed |
| 4 | Special Offer | Products that are part of a limited-time promotion |
| 5 | Free Type Detail | Complimentary items with no monetary value |
| 7 | Ticket Protection | Insurance products to protect ticket purchases |
| 10 | Rewards4Sport | Products associated with the Rewards4Sport loyalty program |
| 20 | Voucher Card Purchases | Physical or digital gift card that can be redeemed |
| 21 | Voucher Card redemption | A voucher card that has been redeemed |

#### Usage

These product type values are used throughout the system to:

- Control display options in checkout processes
- Apply appropriate payment processing rules
- Determine validation requirements
- Configure product fulfillment methods
- Categorize sales for reporting and analytics

The product type is typically stored in the `product_type` field in relevant database tables and is referenced throughout the product management workflow.

# Allocation Checks

The Api can check ticket sales against a set capacity in the following configurations.

## Account Category Max

The Account Category Max setting can be utilized in the /private/order/add and private/order/cart/ endpoints.

If the Account Category Max setting is set in an event, we can check the available allocation a user with a matching
account category has available to them.

If the Account Category Max alloaction has been exceeded as a result of the quantity added in either call, the message
returned will state..

“You have attempted to add more than your allocation”

Order creation progress will stop here.

To initiate this check the user\_order\_account\_id must be sent in the body of the request.

Example “user\_order\_account\_id” => 715,

> Sample Order Add request when checking for Account Category Max

```json
JSON
$json = '{"order" :[\
            {\
                "user_id" => 0,\
                "user_order_account_id" => 715,\
                "payment_id" => 1,\
                "status_id" => 1,\
                "order_amount" => 20,\
                "order_date_time" => '2018-07-18 13:04',\
                "order_email" => "jim@futureticketing.ie",\
                "order_company" => "",\
                "order_title" => "Mr",\
                "first_name" => "Jim",\
                "second_name" => "Magge",\
                "address1" => "address 1",\
                "address2" => "address 2",\
                "address3" => "address 3",\
                "address4" => "address 4",\
                "address5" => "address 5",\
                "address6" => "address 6",\
                "county" => "county",\
                "postcode" => "postcode",\
                "country_id" => 1,\
                "phone" => "123123",\
                "payment_method_id" => 1,\
                "payment_provider" => 'Cash',\
                "payment_result" => '',\
                "accept_terms" => 1,\
                "accept_moreinfo" => 0,\
                "currency" => 'EUR',\
                "delivery_id" => 1,\
                "site_id" => 1,\
                "user_order_detail" => array(\
                    array(\
                        "event_id" => $test_event_id,\
                        "product_id" => $test_product_id,\
                        "product_price" => 5,\
                        "product_vat" => 0,\
                        "quantity" => 1,\
                        "seat": "H-1",\
                        "seat_type" : "Seat"\
                    )\
                )\
            }\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$result = curl_exec($ch);
```

> Sample Order Add response when quantity exceeds Account Category Max

```json
{
    "message" : "You have attempted to add more than your allocation"
}
```

# Seating Plan

## Best Available

The Best Available seats can be utilized in the /private/order/add and private/order/cart/ endpoints.

To get the best available and also if the seats are next to each other in the response, you should not send the seat
type or seat in the request.

Also the event needs to have the best available setting turned on.

You can do that by going to dashboard and editing the event and choosing best available and save the changes.

> Sample Order Add request when wanting to use best available option

```json
JSON
$json = '{"order" :[\
            {\
                "user_id" : 0,\
                "payment_id" : 78,\
                "status_id" : 1,\
                "order_amount" : 20,\
                "order_date_time" : "2018-07-18 13:04",\
                "order_email" : "jim@futureticketing.ie",\
                "order_company" : "",\
                "order_title" : "Mr",\
                "first_name" : "Jim",\
                "second_name" : "Magge",\
                "address1" : "address 1",\
                "address2" : "address 2",\
                "address3" : "address 3",\
                "address4" : "address 4",\
                "address5" : "address 5",\
                "address6" : "address 6",\
                "county" : "county",\
                "postcode" : "postcode",\
                "country_id" : 1,\
                "phone" : "123123",\
                "payment_method_id" : 1,\
                "payment_provider" : "Cash",\
                "payment_result" : "",\
                "accept_terms" : 1,\
                "accept_moreinfo" : 0,\
                "currency" : "EUR",\
                "delivery_id" : 1,\
                "site_id" : 1,\
                "user_order_detail" : [\
                    {\
                        "event_id" : 3832,\
                        "product_id" : 1057,\
                        "product_price" : 5,\
                        "product_vat" : 0,\
                        "quantity" : 3\
                    }\
                ]\
            }\
        ]
    }';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://external.futureticketing.ie/v1/private/order/add');
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer '.$authKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
$result = curl_exec($ch);
```

> Sample Order Add response when wanting to use best available option

```json
[\
    {\
        "added": "order",\
        "id": 73771,\
        "order_uuid": "491f0e71-b98d-4316-83bc-05db3500b906",\
        "external_account_id": null,\
        "payment_provider_id": 78,\
        "best_available_result": {\
            "objects": [\
                "Stand 2-H-15",\
                "Stand 2-H-16",\
                "Stand 2-H-17"\
            ],\
            "next_to_each_other": true\
        },\
        "added_date": "2023-07-03T11:59:06+01:00",\
        "cart_expire": "2023-07-03T12:09:06+01:00",\
        "download_link": "http://embed-dev7.futureticketing.ie/v13.0.0/order/?k=ft52e960fbb0071&o=78&rand=991",\
        "order_token": "KRLXIM2XKZFE2UJTIJVFMMCSJJHFOZZRKZWVEM2VGJHHGUSUKJIWGRDEKZJVQUSXKVCWYV2UKVUEGU3NIZWFMRZZOZRW2ZZRJVKTC2COIZFHEZDLNBMVGVDENZKEQSSEKNWTSNCNGBUEMU2HLEYWK222IZIVQ4CEKVWU422WJBFGQTBTJZ5FE6SKNRQXUZBQMQZDKNKTPJUE4VJTKJVE6RCJOZLFK2CYKRDHAQ2NGJYEIY3NGV3VM3KZPBITG3DVKRVTS2TDGNMXUV3NPBEGI6TMNZLUQ3ZTKMZFM5SWKVKXSYKWLIYGC6SZGRLVKSRSKEZEURKZNJJDETKVLJUWIMCWKFKUQ3BUKUZHARSSKZDHMUCRHU6Q%3D%3D%3D%3D",\
        "order_paynow": "https://localhost/websites/SAUDI_POST_API/html/pages/checkout.php",\
        "order_paynow_url": "https://localhost/websites/SAUDI_POST_API/html/pages/checkout.php?ft_pn=491f0e71-b98d-4316-83bc-05db3500b906",\
        "order_token_url": "https://localhost/websites/SAUDI_POST_API/html/pages/checkout.php?ft_pn=KRLXIM2XKZFE2UJTIJVFMMCSJJHFOZZRKZWVEM2VGJHHGUSUKJIWGRDEKZJVQUSXKVCWYV2UKVUEGU3NIZWFMRZZOZRW2ZZRJVKTC2COIZFHEZDLNBMVGVDENZKEQSSEKNWTSNCNGBUEMU2HLEYWK222IZIVQ4CEKVWU422WJBFGQTBTJZ5FE6SKNRQXUZBQMQZDKNKTPJUE4VJTKJVE6RCJOZLFK2CYKRDHAQ2NGJYEIY3NGV3VM3KZPBITG3DVKRVTS2TDGNMXUV3NPBEGI6TMNZLUQ3ZTKMZFM5SWKVKXSYKWLIYGC6SZGRLVKSRSKEZEURKZNJJDETKVLJUWIMCWKFKUQ3BUKUZHARSSKZDHMUCRHU6Q%3D%3D%3D%3D",\
        "seat_reservation_token": "f4a032a1-94a6-4b16-b533-2ee4b865d363",\
        "order_detail": [\
            {\
                "event_id": 3832,\
                "event_name": "test api seat release",\
                "event_date": "2023-07-08 00:00:00",\
                "product_name": "A1",\
                "product_id": 1057,\
                "product_area_id": "43",\
                "product_area_name": "test capacity area",\
                "ticket_quantity": 3,\
                "points_redeem": "200",\
                "points_award": "5",\
                "ticket_price": 5,\
                "ticket_vat": 0,\
                "ticket_type": 1,\
                "scan_amount": "1",\
                "bundle": false,\
                "order_detail_id": 255190\
            }\
        ],\
        "ticket": [\
            {\
                "barcode_ean13": "2551881700889",\
                "scans_available": "1",\
                "event_id": 3832,\
                "event_date": "2023-07-08 00:00:00",\
                "event_name": "test api seat release",\
                "product_id": 1057,\
                "product_name": "A1",\
                "barcode_external": "FT020000383243105520125518817",\
                "seat": "Stand 2-H-15",\
                "type": "Best Available"\
            },\
            {\
                "barcode_ean13": "2551892894294",\
                "scans_available": "1",\
                "event_id": 3832,\
                "event_date": "2023-07-08 00:00:00",\
                "event_name": "test api seat release",\
                "product_id": 1057,\
                "product_name": "A1",\
                "barcode_external": "FT020000383243105520125518928",\
                "seat": "Stand 2-H-16",\
                "type": "Best Available"\
            },\
            {\
                "barcode_ean13": "2551904102300",\
                "scans_available": "1",\
                "event_id": 3832,\
                "event_date": "2023-07-08 00:00:00",\
                "event_name": "test api seat release",\
                "product_id": 1057,\
                "product_name": "A1",\
                "barcode_external": "FT020000383243105520125519041",\
                "seat": "Stand 2-H-17",\
                "type": "Best Available"\
            }\
        ]\
    }\
]
```

# FT Seats

## Loading the FT Seating Chart

To load the FT Seating Plan we must first call /private/event (POST) endpoint to retrieve the details required to load the chart using the javascript sdk.

> Sample v1/private/event response with FT Seating plan details

```json
[\
{\
            "id": "126",\
            "internal_id": null,\
            "uuid": "895efe3e-18ad-4fdf-9f0d-c5811adfd3ae",\
            "name": "Test product name event - AM - 2023 season",\
             ...........\
            ],
            "seating_public_key": "1567dcd6-...",
            "ft_seats_module": true,
            "event_id": "ft...",
            "seating_plan_detail": {
                "event_key": "aaa...",
                "chart_key": "7d7...",
                "category_unavailable": [\
                    "1",\
                    "2",\
                    "3",\
                    "5",\
                    "6",\
                    "7",\
                    "8",\
                    "9",\
                    "10",\
                    "11",\
                    "12",\
                    "13"\
                ],
                "category_price": [\
                    {\
                        "categoryId": "58ae...",\
                        "name": "FT SEATING TEST CATEGORY 3",\
                        "productTypes": [\
                            {\
                                "productId": "27",\
                                "productName": "Adult 65 +",\
                                "value": 0,\
                                "maxQuant": "0"\
                            }\
                        ]\
                    }\
                ],
                "product_max": [\
                    {\
                        "ticketType": "Adult 65 +",\
                        "quantity": 50\
                    }\
                ],
                "event_to_load": "aaa..."
            },
            "event_seating_plan_list": [\
                "aaa..."\
            ],
            "ftseat_client_id": "373...",
            "ftseat_hold_token": "850...",
            "currency": "&#8364;",
            "product_category_list": [\
                {\
                    "id": "4",\
                    "uuid": "58a...",\
                    "name": "FT SEATING TEST CATEGORY 3",\
                    "description": "<p>Category 3<br></p>",\
                    "image": "",\
                    "order_list": "3",\
                    "discount": "0.00",\
                    "active": "1",\
                    "allow_scan": "1"\
                }\
            ]
        }
]
```

## Using the javascript sdk

To load the FT Seating Plan we must now assign the values retrieved from the private/event call.

The seating chart requires a div to be created in the html of your web page.

This is where the chart will render, in example here we use a div called ‘ft\_seat\_chart’.

> Sample javascript installation

```javascript

<script src ="https://cdn.futureticketing.com/indexwrappercustomer.bundle.js "></script>

    var callBack = {
        productSelectCallback: ftSelectSeat,
        productUnSelectCallback: ftDeselectSeat
    }

    new Wrapper({
        divId: "ft_seat_chart",
        pricing: {category_price},
        eventToLoad: {event_to_load},
        //maxSelectedObjects:null,
        eventList: {event_seating_plan_list},
        clientId: {ftseat_client_id} ,
        holdToken: {ftseat_hold_token},
        currency: {currency},
        //previousRenewalEvent: previousevent,
        seasonEvent: {season_event},
        callBack: callBack
    }).load();

    function ftSelectSeat(seat) {
         //seat is an object that can be used to do whatever is needed
    }

    function ftDeselectSeat(seat) {
        //seat is an object that can be used to do whatever is needed
    }
```

## Adding Seats to the order

Once we select a seat from the chart the ftSelectSeat function is called and is passed the seat object(refer to javascript above).

The seat object holds data specific to that seat.

In order to actually book a seat we need to pass the seat label, type and ftseat\_hold\_token in the body of the /private/order/add endpoint.

The seat label is retrieved via the ftSelectSeat function using this synthax : seat.label


The ftseat\_hold\_token is returned in the private/event endpoint as seen above.

> Sample /private/order/add request with seats

```json

{
"order": [\
    {\
       "delivery_id": 2,\
            "payment_method_id" : 24,\
            "order_email" : "info@futureticketing.ie",\
            "user_order_detail": [\
                {\
                    "event_id" : "126",\
                    "product_id" : "27",\
                    "product_price" : 21.43,\
                    "product_vat" : 0.00,\
                    "quantity" : 1,\
                    "seat" : {seat.label},\
                    "seat_type" : {seat.objectType}\
\
                }\
            ],\
            "seat_reservation_token_held" : {ftseat_hold_token}\
    }\
]
}
```

## Completing the booking

If the user is using FT Payments, Stripe or ryft payments, the seat will be fully booked upon payment completion.

Example booking flow for FT Payments

1 - Add the seat and seat\_reservation\_token\_held token to the order via /private/order/add endpoint as above.

2 - If FT Payment client, user can then call the /private/order/updatepaymentstatus/{order-id} to get the payment intent for payment.

3 - Once the payment is completed the stripe webhook will return to the FT System and will go through the booking mechanism.

Ryft Payments follows same flow.

## Adding Additional Seats

If the user wants to add additional seats to the order after the initial order creation the /private/order/cart/{order-uuid} can be used.

> sample request /private/order/cart/{order-uuid}

```json

{
"order": [\
    {\
        "user_order_detail": [\
                {\
                    "event_id" : "126",\
                    "product_id" : "27",\
                    "product_price" : 21.43,\
                    "product_vat" : 0.00,\
                    "quantity" : 1,\
                    "seat" : {seat.label},\
                    "seat_type" : {seat.objectType}\
\
                }\
            ],\
            "seat_reservation_token_held" : {ftseat_hold_token}\
    }\
]
}
```

## Book seats using other payment types

If the user is not using Stripe, FT Payments or Ryft Payments, they can book seats by passing an additional parameter in the /private/order/updatepaymentstatus/{order-id} endpoint.

The user adds the order in same way as described above, after the order is created they must call the /private/order/updatepaymentstatus/{order-id} endpoint,
and pass the ‘bookseat’ value as true and also pass the status\_id as 4 along with seat\_reservation\_token, this is assuming they have already made payment.
This will book the seats and update the order to payment accepted status, email can also be set to send here if needed.

> sample request /private/order/updatepaymentstatus/{order-id}

```json

{
    "order": [\
        {\
            "status_id": 4,\
            "bookseat": true,\
            "send_email" : 1,\
            "seat_reservation_token" : {ftseat_hold_token}\
        }\
    ]
}
```

# Dashboard Connect

Here we detail how to use the Dashboard Connect Feature in full API flow. The following documents how to process an
order with a connected client.
The linking of clients and sharing of events is done through the future ticketing dashboard portal.

Dashboard connect is available to use in all of the following endpoints. When attempting to use any of the endpoints
listed below in dashboard connect flow we must send a specific
parameter in the body of each request, this parameter is named “ticket\_client\_uuid\_sender” and relates to the
ticket\_client\_uuid of the client who shared the event with you.

This value is captured when calling the v1/private/event endpoint and is then passed to each of the endpoints to trigger
dashboard connect mode.

We will document the request body for each of the following dashboard connect enabled endpoints below.

/private/event POST

/private/order/add POST

/private/order/updatepaymentstatus/{order-id} POST

/private/order/cart/{order-uuid} POST

/private/order/update/{order-id} POST

/private/order/cart/{order-uuid} PATCH

/private/order/cart/{order-uuid} DELETE

/private/delivery GET

/private/charge GET

/private/order/search POST

/private/order/search/id/{order-id} POST

/private/order/search/email/{account-email} GET

/private/order/search/date/2025-03-25/2025-03-31 GET

### Retrieve The “ticket\_client\_uuid\_sender” value

To use any of the endpoints listed above we need to pass the ticket\_client\_uuid\_sender value.

This value is retrieved via the /private/event POST endpoint.

If a client has shared an event with your account, additional details will be returned in the response for this
event.

The ticket\_client\_uuid\_sender value is the value we need to capture and store so it can be passed to all subsequent
endpoints to acheive Dashboard Connect mode.

> Sample /private/event POST response for connected event containing ticket\_client\_uuid\_sender value

```json
{
    "id": "90",
    "internal_id": null,
    "uuid": "0d9f0c9f-bdd0-4fdb-b521-6a24affed19e",
    "name": "test away event share",
    "connected_event": true,
    "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b",
    "venue": [....],
    "account_category_sales": [\
        {\
            "ac_id": "1",\
            "ac_start": "2025-04-01 00:00",\
            "ac_end": "2025-04-05 00:00"\
        }\
    ],
    "product": [.....]
}
```

### Add Dashboard Connect Order

Once we have retrieved the ticket\_client\_uuid\_sender, we can pass this in the /private/order/add POST endpoint to create an order in the connected(event senders) Dashboard.

When the order is fulfilled and payment has been accepted an order will then be created in your account and will be linked to the sender order.

When passing event and product details(id’s,etc..), we always pass them as they are set in your dashboard.

In the response you will see the correspoding event and product id’s as they appear in the sender account, but these are not used in any payloads.

> sample request v1/private/order/add

```json

{
"order": [\
    {\
      "account_id": "13",\
      "status_id": 1,\
      "order_email": "noreply@futureticketing.ie",\
      "check_capacity": "1",\
      "product_handling_fee": 1,\
      "user_order_detail": [\
        {\
          "event_id": "89",\
          "product_id": "67",\
          "product_price": 35.83,\
          "product_vat": 7.17,\
          "quantity": 1\
        }\
    ],\
    "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"\
    }\
]
}
```

### Retrieve Stripe Details for connected client

In order for us to fulfill the order in the connected client dashboard,

we must call the /private/order/updatepaymentstatus/{order-id} endpoint and pass the ticket\_client\_uuid\_sender
value.

This will update the order to awaiting payment and return the stripe details of the connected account.

The StripeAccount, StripeFTPublicKey and PaymentIntentKeySecret values in the response here will need to be used to load
the stripe payment form,

as these will be different from the details returned in non connected order adding flow.

> sample request v1/private/order/updatepaymentstatus/{order-id}

```json

{
    "order": [\
        {\
           "status_id": 2,\
           "paymentintent" : 1,\
           "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"\
        }\
    ]
}
```

> Sample v1/private/order/updatepaymentstatus/{order-id} response with stripe details for connected client

```json
[\
    {\
        "updated": "order",\
        "id": "10531",\
        "ticket": [\
            {\
                "barcode_ean13": "1622672605100",\
                "ticket_id": "17828",\
                "delivery_id": "2",\
                "scan_id_external": null,\
                "scans_available": "1",\
                "event_id": "123",\
                "event_name": "test event for api dashboard connect booking",\
                "event_date": "2025-04-08 00:00:00",\
                "product_id": "37",\
                "product_name": "new category product 3",\
                "product_price": "35.83",\
                "product_vat": "7.17",\
                "detail_type_id": "1",\
                ..............\
            }\
        ],\
        "PaymentIntentKey": "pi_3RDilpCujG0B2pP31q50XUOz",\
        "PaymentIntentKeySecret": "pi_3RDilpCujG0B2pP31q50XUOz_secret_8mwLZXHbbMuvxSVG5cL3Khiyq",\
        "PaymentIntentAmount": 4300,\
        "PaymentIntentMethods": [\
            "card"\
        ],\
        "StripeAccount": "acct_1OcUMcCujG0B2pP3",\
        "StripeFTPublicKey": "pk_test_FavhnmKGPEymOXuOTwlrNxMl",\
        "StripeAccountMessage": "Found Stripe Account - cus_PgiHqFMIyS4h2B",\
        "payment_return": []\
    }\
]
```

### Add to cart using /private/order/cart/{order-uuid} POST

In same we added the initial order details we can also add additional event and product detail to the order using the
/private/order/cart/{order-uuid} POST endpoint.

As before we send the event and product detail as thet appear in your dashboard not the conected clients dashboard.

> sample request /private/order/cart/{order-uuid}

```json

{
    "order":{
        "user_order_detail":[\
            {\
                "id": 15876,\
                "event_id": "89",\
                "product_id": "67",\
                "product_price": 2.00,\
                "product_vat": 0.00,\
                "quantity": 12\
            }\
        ],
        "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
    }
}
```

### Charges and Delivery Types

In Dashboard Connect mode, the order is processed and delivered by the connected sender account,

if needed, this means that any charges or delivery methods that are added to the order need to be retrieved from the
senders account, before been added to the connected order.

> sample request /private/charge

```json

{
      "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

> sample request /private/delivery

```json

{
      "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

### Order Searching

We can search for orders in Dashboard connect in multiple ways.

Important thing to note is when using these endpoints that we pass the details as they would appear in the Sender
account.
So that could be the order id or email etc..

> sample request /private/order/search

```json

{
    "order_id": "10461",
    "order_uuid": "",
    "account_id": "",
    "email": "",
    "first_name": "",
    "second_name": "",
    "company": "",
    "start_date": "",
    "end_date": "",
    "barcode": "",
    "external_barcode": "",
    "external_code": "",
    "legacy_id": "",
    "product_category_id": "",
    "order_status_id": "",
    "updated_since": "",
    "order_status": "",
    "paid_status": "",
    "valid_order": "",
    "ignore_event_category_type": "",
    "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

> sample request /private/order/search/id/{order-id}

```json

{
    "order_status_id": 7,
    "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

> sample request /private/order/search/email/stephen@futureticketing.ie

```json

{
      "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

> sample request /private/order/search/email/noreply@futureticketing.ie

```json

{
      "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

> sample request /private/order/search/date/2025-03-25/2025-03-31

```json

{
    "order_status_id": 7,
    "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
}
```

### Payload for all other Dashboard Connect eneabled endpoints.

Update, Edit, and Delete from cart endpoint examples…

> sample request /private/order/update/{order-id} POST

```json

{
"order": [\
    {\
      "check_capacity": "0",\
      "user_order_detail": [\
        {\
          "event_id": "0",\
          "product_id": "0",\
          "product_name": "Handling Fee",\
          "product_price": 4.3,\
          "product_vat": 0.86,\
          "quantity": 1,\
          "detail_type_id": "2"\
        }\
      ],\
       "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"\
    }\
]
}
```

> sample request /private/order/cart/{order-uuid} PATCH

```json

{
    "order":{
        "user_order_detail":[\
            {\
                "id": 15876,\
                "event_id": "89",\
                "product_id": "67",\
                "product_price": 2.00,\
                "product_vat": 0.00,\
                "quantity": 12\
            }\
        ],
        "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"
    }
}
```

> sample request /private/order/cart/{order-uuid} DELETE

```json

{
    "order": {
        "user_order_detail": [\
            {\
                "id": 1533\
            }\
        ],
        "ticket_client_uuid_sender": "1983a07b-afcd-44db-90f4-e08faa001d6b"

    }
}
```

### Seating Plan with Dashboard Connect.

To use the seating plan in dashboard coonnect mode, we must first load the seating plan using the seating plan details
passed back in the
/private/event POST endpoint.

The seating plan is loaded using the connected(sender) clients seating plan api details.

This means if you have an existing seating plan for non connected seated events, in the javascript for the seating plan
loader you will need to replace the details used to load the seating plan with
the details returned in the /private/event POST call, the seating\_plan\_detail array will have the details needed to
insert into the chart renderer, and seating\_public\_key value is also required.

> sample request /private/event/ POST

```json

{
            "id": "89",

            "seating_public_key": "23808837-9f2b-46c8-85e2-c74dbffae671",
            "seats.io": true,
            "seating_plan_detail": {
                "event_key": "ft65b2759b9c9e0-123",
                "chart_key": "4b69e0cb-7d7b-44aa-93cb-41e0ffc7791d",
                "category_unavailable": [\
                    "1",\
                    "2",\
                    "4",\
                    "5",\
                    "6",\
                    "7",\
                    "8",\
                    "9"\
                ],
                "category_price": [\
                    {\
                        "category": "3",\
                        "ticketTypes": [\
                            {\
                                "ticketType": "new area test product",\
                                "price": 0\
                            },\
                            {\
                                "ticketType": "new category product 3",\
                                "price": 0\
                            },\
                            {\
                                "ticketType": "product category test",\
                                "price": 0\
                            },\
                            {\
                                "ticketType": "test product share",\
                                "price": 0\
                            },\
                            {\
                                "ticketType": "test second plan",\
                                "price": 0\
                            }\
                        ]\
                    }\
                ],
                "product_max": [\
                    {\
                        "ticketType": "new area test product",\
                        "quantity": 50\
                    },\
                    {\
                        "ticketType": "new category product 3",\
                        "quantity": 50\
                    },\
                    {\
                        "ticketType": "product category test",\
                        "quantity": 50\
                    },\
                    {\
                        "ticketType": "test product share",\
                        "quantity": 50\
                    },\
                    {\
                        "ticketType": "test second plan",\
                        "quantity": 50\
                    }\
                ]
            },
            "seat_reservation_token": "25839fb6-9f0f-419a-8218-09180f87cde8",
            "event_seating_plan_mix": true,
            "event_seating_plan_list": [\
                "ft65b2759b9c9e0-123"\
            ],
            "product_category_list": [\
                {\
                    "id": "2",\
                    "uuid": "d87fc31f-2d77-44dd-bf68-60b4fd578f9d",\
                    "name": "third category",\
                    "description": "<p>wer<br></p>",\
                    "image": "",\
                    "order_list": "3",\
                    "discount": "0.00",\
                    "active": "1",\
                    "allow_scan": "0"\
                }\
            ]
        }
}
```

### Multiple Event Restriction

In the current version of this functionality adding different events with a connected event is not allowed.
If you attempt to add a connected event with a non connected event,or add another other connected event in any of the endpoints that allow adding detail, you will recieve an error message, stating this
And detail will not be added to the order.