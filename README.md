# @status-machina/ddb-pattern

**Warning:** This package is unstable and experimental. Use it at your own risk.

## Overview

The `@status-machina/ddb-pattern` package provides utility functions and types for working with events and DynamoDB in a structured manner. It enables the creation, saving, and querying of events while leveraging ULID for unique identifiers and timestamping.

### Event Structure and Expectations

Events should adhere to a specific shape, encapsulated in the `EventBase` interface, which includes at least the following properties:
- `id`: A unique identifier for the event, typically generated using ULID.
- `type`: The type of the event, which helps classify events in your system.
- `timestamp`: The time when the event was created, formatted as an ISO string.
- `data`: A record containing relevant event data.

It’s important to note that if any keys in the `data` property end with `_id`, the events will be replicated and saved with different partition keys. This ensures that events are organized and can be efficiently queried based on these identifiers.

## Installation

You can install this package using npm:

```bash
npm install @status-machina/ddb-pattern
```

## Usage

1. Import the necessary functions and types from the package.

```typescript
import { saveEventsTransact, queryLatestEvent } from '@status-machina/ddb-pattern';
```

2. Use the provided utilities to handle event data in your application.

For detailed usage, please refer to the source code or the examples provided within.

## License

This package is licensed under the MIT License.
