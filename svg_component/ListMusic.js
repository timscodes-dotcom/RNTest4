import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgListMusic = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="currentColor"
    aria-hidden="true"
    className="list_music_svg__w-6 list_music_svg__h-6 list_music_svg__text-gray-800 list_music_svg__dark:text-white"
    {...props}
  >
    <Path
      fillRule="evenodd"
      d="M17.316 4.052a.99.99 0 0 0-.9.14c-.262.19-.416.495-.416.82v8.566a4.6 4.6 0 0 0-2-.464c-1.99 0-4 1.342-4 3.443S12.01 20 14 20s4-1.342 4-3.443V6.801c.538.5 1 1.219 1 2.262 0 .56.448 1.013 1 1.013s1-.453 1-1.013c0-1.905-.956-3.18-1.86-3.942a6.4 6.4 0 0 0-1.636-.998l-.166-.063-.013-.005-.005-.002h-.002zM4 5.012c-.552 0-1 .454-1 1.013 0 .56.448 1.013 1 1.013h9c.552 0 1-.453 1-1.013s-.448-1.012-1-1.012H4Zm0 4.051c-.552 0-1 .454-1 1.013 0 .56.448 1.013 1 1.013h9c.552 0 1-.454 1-1.013 0-.56-.448-1.013-1-1.013zm0 4.05c-.552 0-1 .454-1 1.014 0 .559.448 1.012 1 1.012h4c.552 0 1-.453 1-1.012 0-.56-.448-1.013-1-1.013z"
      clipRule="evenodd"
    />
  </Svg>
);
export default SvgListMusic;
