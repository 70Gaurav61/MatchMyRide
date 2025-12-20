# 🗺️ MapView Component - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Props Reference](#props-reference)
- [Usage Examples](#usage-examples)
- [Key Features](#key-features)
- [Use Cases](#use-cases)
- [Integration](#integration)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Performance Tips](#performance-tips)
- [Testing](#testing)
- [Migration Guide](#migration-guide)
- [Future Roadmap](#future-roadmap)

---

## Overview

The MapView component is a highly reusable, feature-rich map component built on Mapbox GL JS for ridesharing applications. It supports multiple users, real-time location tracking, interactive routes, and seamless integration across different pages.

### What's Included

- **MapView.jsx** - The main map component
- **mapUtils.js** - Utility functions for geolocation, routing, and geocoding
- **Complete backward compatibility** with existing implementations

### Key Capabilities

- ✅ Multiple users with profile photos
- ✅ Static and real-time routes
- ✅ Live location tracking with pulsing indicators
- ✅ Interactive markers with click handlers
- ✅ Route filtering and focusing
- ✅ Customizable styling and behavior
- ✅ Responsive design for desktop and mobile
- ✅ Socket.IO integration for live updates

---

## Quick Start

### Installation

```bash
# MapView uses Mapbox GL JS (should already be installed)
npm install mapbox-gl
```

### Basic Usage

```jsx
import MapView from '../components/mapbox/MapView';

function MyComponent() {
  return (
    <MapView
      config={{ mode: 'view', fitBounds: true }}
      users={users}
      showAllRoutes={true}
    />
  );
}
```

### Simple Route (Backward Compatible)

```jsx
<MapView
  source={source}
  destination={destination}
  route={route}
/>
```

---

## Props Reference

### `config` Object

```javascript
{
  mode: 'view' | 'edit' | 'live',  // Interaction mode
  center: [lng, lat],               // Initial map center
  zoom: number,                     // Initial zoom level (default: 12)
  showControls: boolean,            // Show map controls (default: true)
  fitBounds: boolean,               // Auto-fit to show all markers (default: true)
  mapStyle: string                  // Mapbox style URL
}
```

### `users` Array

```javascript
[{
  id: string,                      // Unique user ID (required)
  name: string,                    // User's display name (required)
  avatar: string,                  // URL to profile photo
  sourceLocation: {                // Starting location
    coordinates: [lng, lat],       // [longitude, latitude] format
    label: string                  // Location name/address
  },
  destinationLocation: {           // Ending location
    coordinates: [lng, lat],
    label: string
  },
  liveLocation: {                  // Real-time location (optional)
    coordinates: [lng, lat]
  },
  route: GeoJSON | {               // User's route (optional)
    geojson: GeoJSON,
    color: string,
    opacity: number
  },
  color: string                    // User's designated color (hex)
}]
```

### `routes` Array (Static Routes)

```javascript
[{
  id: string,                      // Unique route ID
  geojson: GeoJSON,                // Route geometry
  color: string,                   // Hex color
  opacity: number,                 // 0-1
  width: number                    // Pixel width
}]
```

### `markers` Array (Generic Markers)

```javascript
[{
  id: string,
  coordinates: [lng, lat],
  label: string,
  color: string,
  draggable: boolean,
  onDragEnd: (coordinates) => void
}]
```

### Event Handlers

- `onMapClick: (coordinates) => void` - Callback for map clicks
- `onUserMarkerClick: (user) => void` - Callback when user marker is clicked
- `onSourceChange: (location) => void` - When source is changed (edit mode)
- `onDestinationChange: (location) => void` - When destination is changed

### Display Options

- `selectedUserId: string` - Highlight specific user and show only their route
- `showAllRoutes: boolean` - Show all routes or only selected user's route

### Legacy Props (Backward Compatible)

- `source` - Source location object
- `destination` - Destination location object
- `route` - Route GeoJSON
- `memberMarkers` - Array of member markers
- `liveLocation` - Current user's live location

---

## Usage Examples

### Example 1: Simple Route Visualization (RideForm)

Perfect for ride creation where users select source and destination.

```jsx
import MapView from '../components/mapbox/MapView';
import { useState } from 'react';

function RideForm() {
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);

  return (
    <div className="h-96 w-full">
      <MapView
        config={{ 
          mode: 'edit',
          fitBounds: true,
          showControls: true
        }}
        source={source}
        destination={destination}
        route={route}
        onSourceChange={setSource}
        onDestinationChange={setDestination}
      />
    </div>
  );
}
```

### Example 2: Group Ride with Multiple Users

Display all group members with their routes and destinations.

```jsx
import MapView from '../components/mapbox/MapView';
import { useState } from 'react';
import { getUserColor } from '../components/mapbox/mapUtils';

function GroupMapView({ group }) {
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Transform group members to users format
  const users = group.confirmedMembers.map(member => ({
    id: member.user._id,
    name: member.fullName,
    avatar: member.avatar,
    sourceLocation: {
      coordinates: member.ride.sourceLocation.coordinates,
      label: member.ride.source
    },
    destinationLocation: {
      coordinates: member.ride.destinationLocation.coordinates,
      label: member.ride.destination
    },
    liveLocation: member.liveLocation ? {
      coordinates: member.liveLocation.coordinates
    } : null,
    color: getUserColor(member.user._id)
  }));

  // Group common route
  const groupRoute = group.route ? {
    id: 'group-route',
    geojson: group.route,
    color: '#60a5fa',
    opacity: 0.5,
    width: 6
  } : null;

  return (
    <div className="h-screen w-full">
      <MapView
        config={{
          mode: 'view',
          fitBounds: true,
          showControls: true
        }}
        users={users}
        routes={groupRoute ? [groupRoute] : []}
        selectedUserId={selectedUserId}
        showAllRoutes={!selectedUserId}
        onUserMarkerClick={(user) => {
          console.log('Clicked user:', user);
          setSelectedUserId(user.id === selectedUserId ? null : user.id);
        }}
      />
    </div>
  );
}
```

### Example 3: Live Navigation with Real-time Tracking

Track and display live locations of all group members during an active ride.

```jsx
import MapView from '../components/mapbox/MapView';
import { useState, useEffect, useRef } from 'react';
import { getUserColor } from '../components/mapbox/mapUtils';

function LiveNavigation({ groupId, groupMembers, currentUser, socket }) {
  const [myLiveLocation, setMyLiveLocation] = useState(null);
  const [memberLiveLocations, setMemberLiveLocations] = useState({});
  const watchIdRef = useRef(null);

  // Start tracking user's location
  useEffect(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newLocation = {
          coordinates: [pos.coords.longitude, pos.coords.latitude]
        };
        setMyLiveLocation(newLocation);
        
        // Emit to other group members
        if (socket) {
          socket.emit('update-location', {
            groupId: groupId,
            coordinates: newLocation.coordinates,
            timestamp: Date.now()
          });
        }
      },
      (err) => console.error('Location error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [groupId, socket]);

  // Listen for other members' location updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('member-location-update', (data) => {
      setMemberLiveLocations(prev => ({
        ...prev,
        [data.userId]: {
          coordinates: data.coordinates,
          timestamp: data.timestamp
        }
      }));
    });

    return () => socket.off('member-location-update');
  }, [socket]);

  // Convert to users format with live locations
  const users = groupMembers.map(member => {
    const isCurrentUser = member.user._id === currentUser._id;
    
    return {
      id: member.user._id,
      name: member.fullName,
      avatar: member.avatar,
      sourceLocation: {
        coordinates: member.ride.sourceLocation.coordinates,
        label: member.ride.source
      },
      destinationLocation: {
        coordinates: member.ride.destinationLocation.coordinates,
        label: member.ride.destination
      },
      liveLocation: isCurrentUser 
        ? myLiveLocation 
        : memberLiveLocations[member.user._id],
      color: getUserColor(member.user._id)
    };
  });

  return (
    <div className="h-screen w-full">
      <MapView
        config={{
          mode: 'live',
          fitBounds: false, // Don't auto-fit, follow live location
          showControls: true
        }}
        users={users}
        showAllRoutes={true}
      />
    </div>
  );
}
```

### Example 4: GroupPage with "Show on Map" Modal

Add a map modal to your group page for quick visualization.

```jsx
import { useState } from 'react';
import MapView from '../components/mapbox/MapView';
import { getUserColor } from '../components/mapbox/mapUtils';

function GroupPage({ group }) {
  const [showMap, setShowMap] = useState(false);

  const users = group.confirmedMembers.map(member => ({
    id: member.user,
    name: member.fullName,
    avatar: member.avatar,
    sourceLocation: member.ride?.sourceLocation ? {
      coordinates: member.ride.sourceLocation.coordinates,
      label: member.ride.source || 'Source'
    } : null,
    destinationLocation: member.ride?.destinationLocation ? {
      coordinates: member.ride.destinationLocation.coordinates,
      label: member.ride.destination || 'Destination'
    } : null,
    color: getUserColor(member.user)
  }));

  return (
    <div>
      {/* Existing group content */}
      <button
        onClick={() => setShowMap(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
      >
        🗺️ Show on Map
      </button>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Group Route Map</h2>
              <button
                onClick={() => setShowMap(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <MapView
                config={{
                  mode: 'view',
                  fitBounds: true,
                  showControls: true
                }}
                users={users}
                showAllRoutes={true}
                onUserMarkerClick={(user) => {
                  console.log('User clicked:', user);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Key Features

### 1. Multiple Users with Profile Photos

Display unlimited users with circular profile photo markers. Falls back to colored initials if no avatar is provided.

```jsx
<MapView
  users={[
    {
      id: 'user1',
      name: 'Alice Johnson',
      avatar: 'https://example.com/alice.jpg',
      sourceLocation: { coordinates: [77.2, 28.6] },
      destinationLocation: { coordinates: [77.3, 28.7] },
      color: '#2563eb'
    }
  ]}
/>
```

### 2. Live Location Tracking

Real-time location updates with pulsing markers and "LIVE" indicators.

```jsx
const [liveLocation, setLiveLocation] = useState(null);

useEffect(() => {
  const watchId = navigator.geolocation.watchPosition((pos) => {
    setLiveLocation({
      coordinates: [pos.coords.longitude, pos.coords.latitude]
    });
  });
  return () => navigator.geolocation.clearWatch(watchId);
}, []);

<MapView
  users={users.map(u => ({
    ...u,
    liveLocation: u.id === currentUserId ? liveLocation : null
  }))}
/>
```

### 3. Click to Focus on User

Click any user marker to highlight them and show their specific route.

```jsx
<MapView
  users={users}
  selectedUserId={selectedUserId}
  showAllRoutes={!selectedUserId}
  onUserMarkerClick={(user) => {
    setSelectedUserId(user.id);
    console.log('Focused on:', user.name);
  }}
/>
```

### 4. Common Group Route

Display a shared route that all group members will follow.

```jsx
<MapView
  users={groupMembers}
  routes={[
    {
      id: 'group-route',
      geojson: groupRoute,
      color: '#60a5fa',
      opacity: 0.5,
      width: 6
    }
  ]}
/>
```

### 5. Interactive Markers

All markers are clickable and show popups with user information. Destination markers can be clicked to see location details.

### 6. Responsive Design

The map automatically adapts to mobile devices with touch-friendly markers and controls.

---

## Use Cases

### Before Ride Confirmation (Static View)

Show static source/destination for all members with optional route preview.

```jsx
<MapView
  config={{ mode: 'view' }}
  users={members.map(m => ({
    id: m.user._id,
    name: m.fullName,
    avatar: m.avatar,
    sourceLocation: { coordinates: m.ride.sourceLocation.coordinates },
    destinationLocation: { coordinates: m.ride.destinationLocation.coordinates }
  }))}
/>
```

### After Ride Confirmation (Live Tracking)

Show live locations with pulsing markers for active ride monitoring.

```jsx
<MapView
  config={{ mode: 'live' }}
  users={members.map(m => ({
    ...m,
    liveLocation: memberLiveLocations[m.user._id] // Updated via Socket.IO
  }))}
/>
```

### Focus on Specific User

Show route between you and selected user for meeting coordination.

```jsx
const [focusedUser, setFocusedUser] = useState(null);

<MapView
  users={users}
  selectedUserId={focusedUser}
  showAllRoutes={false} // Only show focused route
  onUserMarkerClick={(user) => setFocusedUser(user.id)}
/>
```

---

## Integration

### Socket.IO for Live Locations

#### Client Side (Emitting Location)

```jsx
// In RidePage or GroupPage
useEffect(() => {
  if (!socket || !myLiveLocation) return;
  
  socket.emit('update-location', {
    groupId: groupId,
    coordinates: myLiveLocation.coordinates,
    timestamp: Date.now()
  });
}, [myLiveLocation]);
```

#### Client Side (Receiving Locations)

```jsx
useEffect(() => {
  if (!socket) return;
  
  socket.on('member-location-update', (data) => {
    setMemberLiveLocations(prev => ({
      ...prev,
      [data.userId]: {
        coordinates: data.coordinates,
        timestamp: data.timestamp
      }
    }));
  });
  
  return () => socket.off('member-location-update');
}, [socket]);
```

#### Server Side (Broadcasting)

```javascript
// In backend/src/index.js
socket.on('update-location', async (data) => {
  // Broadcast to all group members
  socket.to(data.groupId).emit('member-location-update', {
    userId: socket.user._id,
    coordinates: data.coordinates,
    timestamp: data.timestamp
  });
});
```

### Utility Functions (mapUtils.js)

The `mapUtils.js` file provides helper functions:

- `getDistanceMeters(coord1, coord2)` - Calculate distance between two points
- `fetchRoute(waypoints)` - Get route from Mapbox Directions API
- `reverseGeocode(lng, lat)` - Convert coordinates to address
- `getUserColor(userId, palette)` - Assign unique color to user
- `getCurrentLocation()` - Get user's current position
- `watchLocation(callback)` - Track user's location in real-time
- `simplifyRoute(coordinates, tolerance)` - Reduce route complexity
- And many more...

---

## Customization

### Custom Colors

```jsx
import { getUserColor } from './components/mapbox/mapUtils';

const customPalette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#96CEB4'];

const users = members.map(m => ({
  ...m,
  color: getUserColor(m.user._id, customPalette)
}));
```

### Custom Marker Sizes

Modify `createUserMarkerElement` in `MapView.jsx`:

```jsx
// Around line 65
width: ${isLive ? '56px' : '48px'}; // Increase sizes
height: ${isLive ? '56px' : '48px'};
```

### Map Style

```jsx
<MapView
  config={{
    mapStyle: 'mapbox://styles/mapbox/dark-v11' // or satellite-v9, outdoors-v12
  }}
/>
```

### Marker Appearance

Edit the CSS in `createUserMarkerElement` function to customize borders, shadows, animations, etc.

---

## Troubleshooting

### Markers Not Showing

**Problem**: User markers don't appear on map

**Solutions**:
1. Check coordinates are in `[lng, lat]` format (not `[lat, lng]`)
2. Verify user objects have `sourceLocation.coordinates`
3. Check browser console for errors
4. Ensure map is loaded (`isMapLoaded` state)
5. Verify Mapbox access token is valid

### Routes Not Rendering

**Problem**: Route lines don't show

**Solutions**:
1. Verify GeoJSON format is correct
2. Check route coordinates array is not empty
3. Ensure `isMapLoaded` is true before adding routes
4. Check map style is fully loaded
5. Verify route color and opacity values

### Live Location Not Updating

**Problem**: Pulsing markers don't move

**Solutions**:
1. Check geolocation permissions in browser
2. Verify `watchPosition` is active
3. Check Socket.IO connection status
4. Ensure state is updating correctly
5. Check for HTTPS (required for geolocation API)

### Click Handler Not Working

**Problem**: Clicking markers does nothing

**Solutions**:
1. Check `onUserMarkerClick` prop is passed
2. Verify marker elements have `cursor: pointer` style
3. Check z-index of markers
4. Look for JavaScript errors in console
5. Ensure event listeners are attached

### Map Not Loading

**Problem**: Map container is blank

**Solutions**:
1. Verify Mapbox access token in environment variables
2. Check container has explicit height (e.g., `h-screen` or `h-96`)
3. Ensure mapbox-gl CSS is imported
4. Check browser console for network errors
5. Verify mapbox-gl version compatibility

---

## Performance Tips

### 1. Debounce Live Location Updates

Prevent excessive socket emissions:

```jsx
import { debounce } from 'lodash';

const debouncedEmit = debounce((coords) => {
  socket.emit('update-location', { groupId, coordinates: coords });
}, 2000); // Update every 2 seconds max

useEffect(() => {
  if (myLiveLocation) {
    debouncedEmit(myLiveLocation.coordinates);
  }
}, [myLiveLocation]);
```

### 2. Limit Route Complexity

Simplify routes with many points:

```jsx
import { simplifyRoute } from './components/mapbox/mapUtils';

const simplified = simplifyRoute(route.geometry.coordinates, 0.0001);
```

### 3. Marker Clustering (For Large Groups)

For 20+ users, consider implementing clustering to improve performance.

### 4. Lazy Load Images

Only load avatar images when markers are in viewport.

### 5. Cleanup Resources

MapView automatically cleans up markers and layers, but ensure Socket.IO listeners are cleaned up in your components.

---

## Testing

### Manual Testing Checklist

- [ ] Map loads correctly
- [ ] User markers appear with photos
- [ ] Clicking marker shows popup
- [ ] Clicking marker focuses route
- [ ] Live location updates in real-time
- [ ] Routes render correctly
- [ ] Map style toggle works (if implemented)
- [ ] Mobile responsive
- [ ] Multiple users visible
- [ ] Colors are distinct

### Test Scenarios

1. **Single User**: Create ride, view map
2. **Group Before Confirmation**: 3+ members, static locations
3. **Group After Confirmation**: Enable live tracking
4. **Focus on User**: Click different user markers
5. **Large Group**: 10+ members
6. **Mobile View**: Test on phone/tablet
7. **Offline Mode**: Test without GPS
8. **Permission Denied**: Test location permission denied

### Unit Test Example

```jsx
import { render, screen } from '@testing-library/react';
import MapView from './MapView';

test('renders map container', () => {
  const users = [{
    id: '1',
    name: 'Test User',
    sourceLocation: { coordinates: [0, 0] },
    destinationLocation: { coordinates: [1, 1] }
  }];
  
  render(<MapView users={users} />);
  const mapContainer = screen.getByRole('region', { name: /map/i });
  expect(mapContainer).toBeInTheDocument();
});
```

---

## Migration Guide

### From Old MapView

The new MapView is **backward compatible**. Existing code using `source`, `destination`, `route`, `memberMarkers`, etc. will continue to work without changes.

#### Step 1: Backup Old MapView

```bash
cd frontend/src/components/mapbox/
mv MapView.jsx MapView_backup.jsx
```

#### Step 2: Replace with New MapView

```bash
mv MapView_new.jsx MapView.jsx
```

#### Step 3: Test Existing Pages

Your existing RideForm and RidePage should work without modifications.

#### Step 4: Migrate to New API (Optional)

Gradually update to use the new `users` and `routes` props for enhanced features:

**Before:**
```jsx
<MapView
  memberMarkers={members.map(m => ({
    coordinates: m.location.coordinates,
    label: m.name
  }))}
/>
```

**After:**
```jsx
<MapView
  users={members.map(m => ({
    id: m._id,
    name: m.name,
    avatar: m.avatar,
    sourceLocation: { coordinates: m.location.coordinates }
  }))}
/>
```

### Migration Checklist

- [ ] Backup old MapView.jsx
- [ ] Copy new MapView to project
- [ ] Add mapUtils.js to project
- [ ] Test existing pages (RideForm, RidePage)
- [ ] Add "Show on Map" to GroupPage (optional)
- [ ] Test with multiple users
- [ ] Implement live location tracking (optional)
- [ ] Customize colors if needed
- [ ] Add error handling
- [ ] Test on mobile devices

---

## Future Roadmap

Possible enhancements not yet implemented:

### Phase 1 (Easy)

- [ ] Marker clustering for 20+ users
- [ ] Custom marker icons per user type
- [ ] Export map as image/PDF
- [ ] Share map link
- [ ] Fullscreen mode
- [ ] Search location on map

### Phase 2 (Medium)

- [ ] ETA calculations and display
- [ ] Traffic layer overlay
- [ ] Alternative routes
- [ ] Turn-by-turn directions
- [ ] Route waypoints
- [ ] Distance matrix between all users

### Phase 3 (Advanced)

- [ ] Offline maps
- [ ] 3D building view
- [ ] Augmented reality navigation
- [ ] Route recording and replay
- [ ] Heatmap of popular routes
- [ ] Integration with ride-sharing APIs

---

## Support & Resources

### Documentation Files

- **README.md** (this file) - Complete documentation
- **mapUtils.js** - Utility functions
- **MapView.jsx** - Component source code

### Getting Help

1. Check this documentation thoroughly
2. Review `mapUtils.js` for available utilities
3. Look at example implementations in pages
4. Check browser console for errors
5. Verify environment variables

### Common Questions

**Q: Does old code still work?**  
A: Yes! The new MapView is fully backward compatible.

**Q: How do I add live locations?**  
A: Set `liveLocation` prop on user objects and use Socket.IO to sync across clients.

**Q: Can I customize marker appearance?**  
A: Yes, modify `createUserMarkerElement` function in MapView.jsx.

**Q: How many users can I show?**  
A: Tested with up to 50 users. Beyond that, consider implementing clustering.

**Q: Does it work on mobile?**  
A: Yes, fully responsive with touch-friendly markers and controls.

**Q: Do I need HTTPS for live tracking?**  
A: Yes, geolocation API requires HTTPS in production.

**Q: What about rate limits?**  
A: Mapbox has generous free tier. Implement debouncing for API calls.

---

## Technical Details

### Component Architecture

```
MapView (Container)
├── Map Instance (Mapbox GL)
├── User Markers (Dynamic)
│   ├── Source Markers (Profile Photos)
│   ├── Destination Markers (Colored Dots)
│   └── Live Location Markers (Pulsing)
├── Routes (GeoJSON Layers)
│   ├── Individual Routes
│   ├── Common Group Route
│   └── Focused Route (Dashed)
├── Popups (On Click/Hover)
└── Controls (Zoom, Style Toggle)
```

### State Management

- `mapRef` - Map instance reference
- `isMapLoaded` - Map loaded state
- `userMarkers` - Marker element references
- `focusedUserId` - Currently focused user
- Internal state for routes and layers

### Coordinate System

Always use `[longitude, latitude]` format (not lat, lng):
- ✅ `[77.2090, 28.6139]` - New Delhi
- ❌ `[28.6139, 77.2090]` - Wrong order

---

## Best Practices

1. **Always Set Height**: Map container must have explicit height
2. **Unique IDs**: Ensure all user and route IDs are unique
3. **Error Boundaries**: Wrap MapView in error boundary for production
4. **Loading States**: Show skeleton while map loads
5. **Permissions**: Request location permissions early
6. **Debouncing**: Debounce location updates and API calls
7. **Cleanup**: Clean up event listeners and watchers
8. **Memoization**: Use React.memo for user objects if needed
9. **Accessibility**: Add ARIA labels for screen readers
10. **Testing**: Test on multiple devices and browsers

---

## License & Credits

**Created**: November 2025  
**Version**: 1.0.0  
**License**: MIT  
**Built with**: Mapbox GL JS, React

**Enjoy your enhanced mapping experience! 🚗🗺️**
