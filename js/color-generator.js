define([], function() {
  "use strict";

  // https://en.wikipedia.org/wiki/Web_colors#HTML_color_names
  // i removed white, silver and gray, and changed the order to my liking
  const colors = [
    '#0000FF',
    '#FF0000',
    '#800000',
    '#808000',
    '#00FF00',
    '#008000',
    '#00FFFF',
    '#008080',
    '#000080',
    '#FF00FF',
    '#800080',
    '#000000',
    '#FFFF00'
  ];

  return () => {
    const result = colors.shift();
    colors.push(result);
    return result;
  };
});
