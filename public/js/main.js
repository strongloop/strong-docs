// Copyright IBM Corp. 2013. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

$(document).ready(function () {
  // Switch from empty anchors to id-ed headings
  $('a[name]').get().forEach(function (i) {
    var $i = $(i);

    $i.next().attr('id', $i.attr('name'));
    $i.detach();
  });


  $('.scroll-spy-target').on('activate.bs.scrollspy', function (event) {
    var $this = $(this);
    var $target = $(event.target);

    $this.scrollTo($target, 0, {
      offset: -($this.innerHeight() / 2)
    });
  });
});
