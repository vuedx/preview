export interface DeviceImage {
  photo: string;
  mask?: string;
}

export interface DeviceSpecs {
  name: string;
  type: string;
  width: number;
  height: number;
  offset: { top: number; right: number; bottom: number; left: number };
  touch?: boolean;
  frames: {
    default: DeviceImage;
    landscape?: DeviceImage;
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
    touch: true,
    frames: {
      default: {
        photo: '/@preview/devices/iPhone-11-Portrait.png',
        mask: 'url(#iPhone-11-Portrait)',
      },
      landscape: {
        photo: '/@preview/devices/iPhone-11-Landscape.png',
        mask: 'url(#iPhone-11-Landscape)',
      },
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
    touch: true,
    frames: {
      default: {
        photo: '/@preview/devices/iPad-Pro-13-Portrait.png',
        mask: 'inset(0 0 0 0 round 34px)',
      },
      landscape: {
        photo: '/@preview/devices/iPad-Pro-13-Landscape.png',
        mask: 'inset(0 0 0 0 round 34px)',
      },
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
    touch: false,
    frames: {
      default: {
        photo: '/@preview/devices/MacBook-Pro-16.png',
      },
    },
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
