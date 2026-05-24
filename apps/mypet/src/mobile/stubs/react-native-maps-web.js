import { View } from 'react-native';

const MapView = ({ children, style }) => <View style={style}>{children}</View>;
const Marker = () => null;
const Callout = ({ children }) => <>{children}</>;
const UrlTile = () => null;

export { Marker, Callout, UrlTile };
export default MapView;
