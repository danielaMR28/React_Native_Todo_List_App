import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './app/screens/Login';
import Details from './app/screens/Details';
import List from './app/screens/List';
import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_AUTH } from './FirebaseConfig';

const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();

function InsideLayout() {
  return (
    <InsideStack.Navigator>
      <InsideStack.Screen name="Mis To-Do" component={List} />
      <InsideStack.Screen name="details" component={Details} />
    </InsideStack.Navigator>
  )
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setUser(user);
    });
  }, [])

return (
  <NavigationContainer>
    <Stack.Navigator initialRouteName='Login'>
      {user ? (
        <Stack.Screen name='Inside' component={InsideLayout} options={{ headerShown: false }} />
      ):(
        <Stack.Screen name='Login' component={Login} options={{ headerShown: false }} />
      )}
      
    </Stack.Navigator>
  </NavigationContainer>
);
}
