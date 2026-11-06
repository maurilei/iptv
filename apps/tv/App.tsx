import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';

const App = (): React.JSX.Element => {
  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <HomeScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07090e',
  },
});

export default App;
