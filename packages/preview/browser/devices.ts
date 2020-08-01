export interface DeviceFrame {
  name: string;
  width: number;
  height: number;
  ratio: number;
  offset: { top: number; right: number; bottom: number; left: number };
  frame: string;
  screen?: string;
}

import iPhoneX from './frames/iphone-x.svg';
import iPhoneXScreen from './frames/iphone-x.screen.svg';
import iPadPro13 from './frames/ipad-pro-13.svg';
import iPadPro13Screen from './frames/ipad-pro-13.screen.svg';
import MacBookPro from './frames/macbook-pro.svg';

const devices: DeviceFrame[] = [
  {
    name: 'iPhone X',
    width: 828,
    height: 1792,
    ratio: 2,
    offset: {
      top: 71,
      right: 76,
      bottom: 71,
      left: 75,
    },
    frame: iPhoneX,
    screen: iPhoneXScreen,
  },
  {
    name: 'iPad Pro 12.9"',
    width: 2048,
    height: 2732,
    ratio: 2,
    offset: {
      top: 102,
      right: 101,
      bottom: 96,
      left: 96,
    },
    frame: iPadPro13,
    screen: iPadPro13Screen,
  },
  {
    name: 'MacBook Pro 16"',
    width: 3072,
    height: 1920,
    ratio: 2,
    offset: {
      top: 98,
      right: 419,
      bottom: 223,
      left: 419,
    },
    frame: MacBookPro,
  },
];

export default toMap(devices);

function toMap(devices: DeviceFrame[]) {
  const map: Record<string, DeviceFrame> = {};

  devices.forEach((device) => {
    map[device.name] = device;

    device.width /= device.ratio;
    device.height /= device.ratio;
    device.offset.top /= device.ratio;
    device.offset.right /= device.ratio;
    device.offset.bottom /= device.ratio;
    device.offset.left /= device.ratio;
  });

  return map;
}
