import { useLocation } from 'react-router-dom';
import NavigationComponent from '../components/Navigation.jsx'

function Navigation() {
  const location = useLocation();
  
  const { groupId, group } = location.state || {};
  
  return (
    <NavigationComponent
      groupId={groupId}
      initialGroup={group}
    />
  );
}

export default Navigation;