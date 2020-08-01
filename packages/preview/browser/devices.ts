export interface DeviceSpecs {
  name: string;
  type: string;
  width: number;
  height: number;
  offset: { top: number; right: number; bottom: number; left: number };
  deviceFrame: string;
  screenClipPath?: string;
  features: {
    orientation?: Array<'Portrait' | 'Landscape (left)' | 'Landscape (right)'>;
    touch?: boolean;
  };
}

interface RawDeviceSpecs extends DeviceSpecs {
  ratio: number;
}

const devices: RawDeviceSpecs[] = [
  {
    name: 'iPhone X',
    type: 'iphone',
    width: 828,
    height: 1792,
    ratio: 2,
    offset: {
      top: 71,
      right: 76,
      bottom: 71,
      left: 75,
    },
    deviceFrame: '/@preview/devices/iPhone-X.svg',
    screenClipPath: '/@preview/devices/iPhone-X.screen.svg',
    features: {
      orientation: ['Portrait', 'Landscape (left)', 'Landscape (right)'],
      touch: true,
    },
  },
  {
    name: 'iPad Pro 12.9"',
    type: 'ipad',
    width: 2048,
    height: 2732,
    ratio: 2,
    offset: {
      top: 102,
      right: 101,
      bottom: 96,
      left: 96,
    },
    deviceFrame: '/@preview/devices/iPad-Pro-12.9.svg',
    screenClipPath: '/@preview/devices/iPad-Pro-12.9.screen.svg',
    features: {
      orientation: ['Portrait', 'Landscape (left)', 'Landscape (right)'],
      touch: true,
    },
  },
  {
    name: 'MacBook Pro 16"',
    type: 'desktop',
    width: 3072,
    height: 1920,
    ratio: 2,
    offset: {
      top: 98,
      right: 419,
      bottom: 223,
      left: 419,
    },
    deviceFrame: '/@preview/devices/MacBook-Pro-16.svg',
    features: {},
  },
];

export default toMap(devices);

function toMap(devices: RawDeviceSpecs[]) {
  const map: Record<string, DeviceSpecs> = {};

  devices.forEach((device) => {
    map[device.name] = device;

    device.width /= device.ratio;
    device.height /= device.ratio;
    device.offset.top /= device.ratio;
    device.offset.right /= device.ratio;
    device.offset.bottom /= device.ratio;
    device.offset.left /= device.ratio;

    delete device.ratio;
  });

  return map;
}
